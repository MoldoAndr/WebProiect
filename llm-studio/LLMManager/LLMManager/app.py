import os
import logging
import requests
from typing import Dict, List, Any, Optional
from flask import Flask, request, jsonify
import torch
from concurrent.futures import ThreadPoolExecutor
import atexit

logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

MAX_GENERATION_WORKERS = max(1, os.cpu_count() // 2)
logger.info(f"Initializing ThreadPoolExecutor with max_workers={MAX_GENERATION_WORKERS}")
executor = ThreadPoolExecutor(max_workers=MAX_GENERATION_WORKERS)

def shutdown_executor():
    logger.info("Shutting down ThreadPoolExecutor...")
    executor.shutdown(wait=True)
    logger.info("ThreadPoolExecutor shut down complete.")
atexit.register(shutdown_executor)


class LLMModel:
    """A general-purpose LLM model class that can handle different model types (Optimized)"""

    def __init__(self, model_path: str, model_type: str, context_window: int = 2048,
                 n_threads: int = 4, n_gpu_layers: int = 0, temperature: float = 0.7):
        """
        Initialize the LLM model based on the provided type.

        Args:
            model_path: Path to the model file or Hugging Face model ID
            model_type: Type of model ('llama', 'phi2', 'rwkv')
            context_window: Size of the context window (token limit)
            n_threads: Number of CPU threads to use (crucial for llama.cpp performance)
            n_gpu_layers: Number of layers to offload to GPU (crucial for llama.cpp performance)
            temperature: Sampling temperature for generation
        """
        self.model_path = model_path
        self.model_type = model_type.lower()
        self.context_window = context_window
        self.n_threads = max(1, n_threads)
        self.n_gpu_layers = n_gpu_layers
        self.temperature = temperature

        logger.info(f"Initializing {self.model_type} model from {model_path}")
        logger.info(f"Parameters: context_window={context_window}, threads={self.n_threads}, gpu_layers={n_gpu_layers}")

        try:
            is_local_file = os.path.exists(model_path) and model_path.endswith('.gguf')
            self.device = "cuda" if torch.cuda.is_available() and n_gpu_layers > 0 else "cpu"

            if is_local_file and self.model_type != "phi2":
                from llama_cpp import Llama
                logger.info(f"Attempting to load GGUF model with llama.cpp using {self.n_threads} threads and {self.n_gpu_layers} GPU layers.")
                self.model = Llama(
                    model_path=model_path,
                    n_ctx=context_window,
                    n_threads=self.n_threads,
                    n_gpu_layers=n_gpu_layers,
                    verbose=False
                )
                self.using_llama_cpp = True
                self.using_rwkv_native = False
                self.using_transformers = False
                logger.info(f"Loaded GGUF model with llama.cpp backend. Device implicitly handled by n_gpu_layers.")

            elif self.model_type == "phi2":
                from transformers import AutoModelForCausalLM, AutoTokenizer

                logger.info(f"Loading Phi-2 model using Transformers on device: {'auto'}")

                try:
                    from optimum.bettertransformer import BetterTransformer
                    use_bettertransformer = True
                    logger.info("Optimum BetterTransformer library found.")
                except ImportError:
                    logger.warning("Optimum BetterTransformer not found. Install with 'pip install optimum'. Performance may be suboptimal.")
                    use_bettertransformer = False

                self.tokenizer = AutoTokenizer.from_pretrained(model_path)
                self.model = AutoModelForCausalLM.from_pretrained(
                    model_path,
                    load_in_4bit=True,
                    device_map="auto",
                    trust_remote_code=True
                )
                self.model.eval()

                if use_bettertransformer:
                    try:
                        self.model = BetterTransformer.transform(self.model)
                        logger.info("Applied Optimum BetterTransformer successfully.")
                    except Exception as bt_err:
                        logger.warning(f"Could not apply BetterTransformer (may conflict with quantization or model type): {bt_err}")

                self.using_llama_cpp = False
                self.using_rwkv_native = False
                self.using_transformers = True
                logger.info(f"Loaded Phi-2 model from Hugging Face with Transformers.")

            elif self.model_type == "rwkv" and not is_local_file:
                try:
                    from rwkv.model import RWKV
                    from rwkv.utils import PIPELINE

                    rwkv_device = "cuda" if self.device == "cuda" else "cpu"
                    precision = "fp16" if rwkv_device == "cuda" else "bf16"
                    strategy = f'{rwkv_device} {precision}'
                    logger.info(f"Loading RWKV model with native backend using strategy: {strategy}")

                    self.model = RWKV(model=model_path, strategy=strategy)
                    self.pipeline = PIPELINE(self.model)
                    self.using_llama_cpp = False
                    self.using_rwkv_native = True
                    self.using_transformers = False
                    logger.info(f"Loaded RWKV model with native backend")
                except ImportError:
                    logger.error("RWKV package not available. Please install with 'pip install rwkv'. Cannot load non-GGUF RWKV model.")
                    raise ValueError("RWKV package not available and model is not in GGUF format")
                except Exception as e:
                    logger.error(f"Failed to load RWKV model with native backend: {e}")
                    raise

            else:
                if is_local_file:
                     logger.error(f"Model {model_path} is a GGUF file, but type is set to '{self.model_type}'. For GGUF, use 'llama' type (even for non-Llama architectures supported by llama.cpp).")
                     raise ValueError(f"Incorrect model type '{self.model_type}' for GGUF file. Use 'llama'.")
                else:
                    logger.error(f"Unsupported model configuration: path={model_path}, type={self.model_type}, is_local_gguf={is_local_file}")
                    raise ValueError(f"Cannot load model. Ensure path points to a valid GGUF (use type 'llama') or a Hugging Face ID matching the type ('phi2', 'rwkv').")


            model_size = self.get_model_size()
            logger.info(f"Loaded model with size: {model_size:.2f} MB")

        except Exception as e:
            logger.error(f"Failed to initialize model '{model_path}' of type '{self.model_type}': {e}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            raise

    def get_model_size(self) -> float:
        """Get the size of the model in MB"""
        if self.using_llama_cpp:
            if os.path.exists(self.model_path):
                return os.path.getsize(self.model_path) / (1024 * 1024)
        elif self.using_transformers:
            try:
                param_count = sum(p.numel() for p in self.model.parameters())
                estimated_bytes_per_param = 2
                return (param_count * estimated_bytes_per_param) / (1024 * 1024)
            except Exception as e:
                logger.warning(f"Could not accurately estimate Transformers model size: {e}")
                pass
        elif self.using_rwkv_native:
             if os.path.exists(self.model_path):
                 return os.path.getsize(self.model_path) / (1024 * 1024)

        if os.path.exists(self.model_path) and os.path.isfile(self.model_path):
             return os.path.getsize(self.model_path) / (1024 * 1024)

        return 0.0

    def generate(self, conversation_history: List[Dict[str, str]]) -> str:
        """Generate a response based on conversation history"""
        logger.info(f"Generating response with {self.model_type} model")

        try:
            if self.model_type == "phi2":
                prompt = self._format_phi2_prompt(conversation_history)
            elif self.model_type == "rwkv":
                prompt = self._format_rwkv_prompt(conversation_history)
            else:
                prompt = self._format_llama_prompt(conversation_history)

            logger.debug(f"Using prompt (first 100 chars): {prompt[:100]}...")

            response = ""
            max_new_tokens = self.context_window // 4

            if self.using_llama_cpp:
                output = self.model.create_completion(
                    prompt=prompt,
                    max_tokens=max_new_tokens,
                    temperature=self.temperature,
                    stop=self._get_stop_tokens(),
                )
                if isinstance(output, dict) and "choices" in output and output["choices"]:
                    response = output["choices"][0].get("text", "").strip()
                else:
                    logger.warning(f"Unexpected llama.cpp output format: {output}")
                    response = str(output)

            elif self.using_rwkv_native:
                state = None

                logger.debug("Processing RWKV prompt...")
                tokens = self.pipeline.encode(prompt)
                _, state = self.pipeline.model.forward(tokens, state)
                logger.debug("Generating RWKV response...")

                response_tokens = []
                for _ in range(max_new_tokens):
                    out_logits, state = self.pipeline.model.forward([], state)
                    token_int = self.pipeline.sample_logits(out_logits, temperature=self.temperature, top_p=None)
                    decoded_token = self.pipeline.decode([token_int])

                    current_response_text = "".join(response_tokens) + decoded_token
                    if any(stop in current_response_text for stop in self._get_stop_tokens()):
                         logger.debug("Stop token detected in RWKV generation.")
                         break
                    if decoded_token == '\n\n':
                         logger.debug("Double newline stop detected in RWKV generation.")
                         break
                    if token_int == 0:
                        logger.debug("EOS token (0) detected in RWKV generation.")
                        break

                    response_tokens.append(decoded_token)

                response = "".join(response_tokens).strip()


            elif self.using_transformers:
                with torch.inference_mode():
                    inputs = self.tokenizer(prompt, return_tensors="pt", truncation=True, max_length=self.context_window - max_new_tokens).to(self.model.device)

                    outputs = self.model.generate(
                        **inputs,
                        max_new_tokens=max_new_tokens,
                        do_sample=True,
                        temperature=self.temperature,
                        pad_token_id=self.tokenizer.eos_token_id,
                    )

                    response = self.tokenizer.decode(
                        outputs[0][inputs["input_ids"].shape[1]:],
                        skip_special_tokens=True
                    ).strip()

            if response and not self._is_english(response):
                logger.warning(f"Non-English response detected ({response[:50]}...), falling back to English canned response.")
                response = "I apologize, but I can only respond in English. Please ask your question in English."

            logger.debug(f"Generated response (first 100 chars): {response[:100]}...")
            return response

        except Exception as e:
            logger.error(f"Error generating response for model {self.model_type}: {e}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return f"I encountered an internal error while trying to generate a response. Please try again later."

    def _format_llama_prompt(self, conversation_history: List[Dict[str, str]]) -> str:
        """Format conversation history for Llama models (ChatML format)"""
        prompt = ""

        for msg in conversation_history:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if role == "system":
                prompt += f"<|im_start|>system\n{content}<|im_end|>\n"
            elif role == "user":
                prompt += f"<|im_start|>user\n{content}<|im_end|>\n"
            elif role == "assistant":
                prompt += f"<|im_start|>assistant\n{content}<|im_end|>\n"
        prompt += "<|im_start|>assistant\n"
        return prompt

    def _format_phi2_prompt(self, conversation_history: List[Dict[str, str]]) -> str:
        """Format conversation history for Phi-2 model"""
        prompt = ""
        if self.using_transformers and hasattr(self.tokenizer, 'apply_chat_template'):
             try:
                 formatted_history = [{'role': msg['role'], 'content': msg['content']} for msg in conversation_history]
                 prompt = self.tokenizer.apply_chat_template(formatted_history, tokenize=False, add_generation_prompt=True)
                 logger.debug("Using tokenizer's apply_chat_template for Phi-2 format.")
                 return prompt
             except Exception as e:
                 logger.warning(f"Failed to use apply_chat_template for Phi-2, falling back to manual formatting: {e}")

        logger.debug("Using manual prompt formatting for Phi-2.")
        for msg in conversation_history:
             role = msg.get("role", "user")
             content = msg.get("content", "")
             if role == "system":
                prompt += f"System instruction: {content}\n"
             elif role == "user":
                 prompt += f"Instruct: {content}\nOutput:"
             elif role == "assistant":
                 prompt += f" {content}\n"
        if not prompt.endswith("Output:"):
             prompt += "Output:"
        return prompt

    def modify_parameters(self, temperature: Optional[float] = None, 
                     context_window: Optional[int] = None,
                     n_threads: Optional[int] = None,
                     n_gpu_layers: Optional[int] = None) -> Dict[str, Any]:
        """Modify model parameters dynamically where possible."""
        changes = {}
        errors = {}

        if temperature is not None:
            if not isinstance(temperature, (int, float)) or temperature < 0:
                errors["temperature"] = "Must be a non-negative number"
            else:
                logger.info(f"Updating temperature from {self.temperature} to {temperature}")
                self.temperature = float(temperature)
                changes["temperature"] = self.temperature

        if context_window is not None:
            if not isinstance(context_window, int) or context_window <= 0:
                errors["context_window"] = "Must be a positive integer"
            elif self.using_llama_cpp and context_window != self.context_window:
                errors["context_window"] = "Cannot change context_window for llama.cpp models without reinitialization"
            else:
                logger.info(f"Updating context_window from {self.context_window} to {context_window}")
                self.context_window = context_window
                changes["context_window"] = self.context_window

        if n_threads is not None:
            if not isinstance(n_threads, int) or n_threads < 1:
                errors["n_threads"] = "Must be a positive integer"
            elif not self.using_llama_cpp:
                errors["n_threads"] = "Only applicable to llama.cpp models"
            else:
                logger.info(f"Updating n_threads from {self.n_threads} to {n_threads}")
                self.n_threads = max(1, n_threads)
                self.model.n_threads = self.n_threads  # Update llama.cpp runtime parameter
                changes["n_threads"] = self.n_threads

        if n_gpu_layers is not None:
            if not isinstance(n_gpu_layers, int) or n_gpu_layers < 0:
                errors["n_gpu_layers"] = "Must be a non-negative integer"
            elif not self.using_llama_cpp:
                errors["n_gpu_layers"] = "Only applicable to llama.cpp models"
            elif n_gpu_layers != self.n_gpu_layers:
                errors["n_gpu_layers"] = "Cannot change n_gpu_layers without reinitializing the model"
            else:
                changes["n_gpu_layers"] = self.n_gpu_layers  # No change, just report current value

        return {"changes": changes, "errors": errors}

    def _format_rwkv_prompt(self, conversation_history: List[Dict[str, str]]) -> str:
        """Format conversation history for RWKV model"""
        prompt = ""
        for msg in conversation_history:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if role == "system":
                prompt += f"System: {content}\n\n"
            elif role == "user":
                prompt += f"User: {content}\n\n"
            elif role == "assistant":
                prompt += f"Assistant: {content}\n\n"
        prompt += "Assistant:"
        return prompt

    def _get_stop_tokens(self) -> List[str]:
        """Get appropriate stop tokens based on model type and format used"""
        if self.model_type == "phi2":
            return ["\nInstruct:", "<|endoftext|>", "User:"]
        elif self.model_type == "rwkv":
            return ["\nUser:", "\nSystem:", "\n\n", "User:"]
        else:
            return ["<|im_end|>", "<|im_start|>"]

    def _is_english(self, text: str) -> bool:
        """Simple heuristic check to detect if text is primarily English (Faster)."""
        if not text or not isinstance(text, str):
            return False

        text = text.strip()
        if not text:
            return True

        non_ascii_alpha_count = 0
        alpha_count = 0

        sample_len = min(500, len(text))
        for char in text[:sample_len]:
            if char.isalpha():
                alpha_count += 1
                if ord(char) > 127:
                    non_ascii_alpha_count += 1

        if alpha_count == 0:
            return True

        ratio = non_ascii_alpha_count / alpha_count
        is_likely_english = ratio < 0.15
        return is_likely_english

class LLMConversationManager:
    """A lightweight manager for LLM conversations"""

    def __init__(self):
        self.models: Dict[str, LLMModel] = {}
        self.conversations: Dict[str, Dict[str, Any]] = {}

    def add_model(self, model_id: str, model_instance: LLMModel) -> None:
        """Add a model to the manager"""
        if model_id in self.models:
             logger.warning(f"Model ID '{model_id}' already exists. Overwriting.")
        logger.info(f"Adding model: {model_id} (Type: {model_instance.model_type})")
        self.models[model_id] = model_instance

    def remove_model(self, model_id: str) -> bool:
        """Remove a model from the manager"""
        if model_id not in self.models:
            logger.warning(f"Attempted to remove non-existent model: {model_id}")
            return False

        logger.info(f"Removing model: {model_id}")

        conv_to_remove = [conv_id for conv_id, conv_data in self.conversations.items()
                          if conv_data.get("model_id") == model_id]

        for conv_id in conv_to_remove:
            del self.conversations[conv_id]
            logger.info(f"Removed conversation {conv_id} associated with removed model {model_id}")

        del self.models[model_id]
        import gc
        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            logger.info("Cleared PyTorch CUDA cache after model removal.")

        return True

    def create_conversation(self, model_id: str, conversation_id: Optional[str] = None) -> str:
        """Create a new conversation with a specific model"""
        if model_id not in self.models:
            logger.error(f"Cannot create conversation: Model {model_id} not found.")
            raise ValueError(f"Model {model_id} not found")

        if conversation_id and conversation_id in self.conversations:
            logger.warning(f"Conversation ID '{conversation_id}' already exists. Resetting it.")
            self.reset_conversation(conversation_id)
            return conversation_id
        elif conversation_id is None:
            import uuid
            conversation_id = f"{model_id}_conv_{uuid.uuid4().hex[:8]}"


        logger.info(f"Creating conversation: {conversation_id} with model: {model_id}")
        self.conversations[conversation_id] = {
            "model_id": model_id,
            "history": [{
                "role": "system",
                "content": "You are a helpful English language assistant. Always respond clearly and concisely in English, regardless of the input language. If the user speaks another language, politely ask them to use English."
            }]
        }
        return conversation_id

    def get_response(self, conversation_id: str, message: str) -> str:
        """Get a response from the model for the given conversation (Blocking call)"""
        if conversation_id not in self.conversations:
            logger.error(f"Cannot get response: Conversation {conversation_id} not found.")
            raise ValueError(f"Conversation {conversation_id} not found")

        conv_data = self.conversations[conversation_id]
        model_id = conv_data["model_id"]

        if model_id not in self.models:
            logger.error(f"Model '{model_id}' associated with conversation '{conversation_id}' is no longer loaded.")
            raise ValueError(f"Model '{model_id}' for conversation '{conversation_id}' not found.")

        model = self.models[model_id]

        conv_data["history"].append({
            "role": "user",
            "content": message
        })

        logger.info(f"Generating response for conversation: {conversation_id} using model: {model_id}")

        try:
            response = model.generate(conv_data["history"])
        except Exception as e:
             logger.error(f"Exception during model.generate for conv {conversation_id}: {e}")
             return f"Error generating response from model {model_id}: {e}"

        conv_data["history"].append({
            "role": "assistant",
            "content": response
        })

        max_history_messages = 30
        if len(conv_data["history"]) > max_history_messages:
            logger.warning(f"Trimming conversation {conversation_id} history (>{max_history_messages} messages)")
            keep_messages = max_history_messages - 1
            conv_data["history"] = [conv_data["history"][0]] + conv_data["history"][-keep_messages:]

        return response

    def get_conversation_history(self, conversation_id: str) -> List[Dict[str, str]]:
        """Get the history of a conversation"""
        if conversation_id not in self.conversations:
            raise ValueError(f"Conversation {conversation_id} not found")
        return self.conversations[conversation_id]["history"]

    def reset_conversation(self, conversation_id: str) -> None:
        """Reset a conversation's history while keeping the same model"""
        if conversation_id not in self.conversations:
             logger.error(f"Cannot reset: Conversation {conversation_id} not found.")
             raise ValueError(f"Conversation {conversation_id} not found")

        model_id = self.conversations[conversation_id]["model_id"]
        logger.info(f"Resetting conversation: {conversation_id} (model: {model_id})")
        self.conversations[conversation_id]["history"] = [{
            "role": "system",
            "content": "You are a helpful English language assistant. Always respond clearly and concisely in English, regardless of the input language. If the user speaks another language, politely ask them to use English."
        }]

    def model_info(self, model_id: str) -> Dict[str, Any]:
        """Get information about a model"""
        if model_id not in self.models:
             logger.error(f"Cannot get info: Model {model_id} not found.")
             raise ValueError(f"Model {model_id} not found")

        model = self.models[model_id]
        try:
            size_mb = model.get_model_size()
        except Exception as e:
            logger.warning(f"Could not get size for model {model_id}: {e}")
            size_mb = "N/A"

        return {
            "id": model_id,
            "type": model.model_type,
            "model_path": model.model_path,
            "size_mb": size_mb,
            "context_window": model.context_window,
            "n_threads": model.n_threads if model.using_llama_cpp else "N/A (Not llama.cpp)",
            "n_gpu_layers": model.n_gpu_layers if model.using_llama_cpp else "N/A (Not llama.cpp)",
            "temperature": model.temperature,
            "backend": "llama.cpp" if model.using_llama_cpp else \
                       "transformers" if model.using_transformers else \
                       "rwkv-native" if model.using_rwkv_native else "unknown",
             "device_info": f"llama.cpp (GPU layers: {model.n_gpu_layers})" if model.using_llama_cpp else \
                            f"Transformers (device_map: auto, detected: {model.model.device if hasattr(model.model, 'device') else 'N/A'})" if model.using_transformers else \
                            f"RWKV Native (strategy: {model.model.strategy if hasattr(model.model, 'strategy') else 'N/A'})" if model.using_rwkv_native else "unknown"

        }

def analyze_gguf_file(file_path):
    """Extract metadata from a GGUF file to check compatibility (basic check)"""
    try:
        import struct
        import json

        if not os.path.exists(file_path):
            return {"error": "File not found", "path_checked": file_path}

        with open(file_path, 'rb') as f:
            magic = f.read(4)
            if magic != b'GGUF':
                return {"error": "Not a valid GGUF file (magic number mismatch)", "file_path": file_path}

            version = struct.unpack('<I', f.read(4))[0]
            tensor_count = struct.unpack('<Q', f.read(8))[0]
            metadata_kv_count = struct.unpack('<Q', f.read(8))[0]

            metadata = {
                "file_size_mb": round(os.path.getsize(file_path) / (1024 * 1024), 2),
                "gguf_version": version,
                "tensor_count": tensor_count,
                "metadata_kv_count": metadata_kv_count,
                "architecture": "unknown"
            }

            for _ in range(metadata_kv_count):
                key_len = struct.unpack('<Q', f.read(8))[0]
                key_bytes = f.read(key_len)
                value_type = struct.unpack('<I', f.read(4))[0]

                if value_type == 0:
                     value_len = 1
                elif value_type == 1:
                     value_len = 1
                elif value_type == 2:
                     value_len = 2
                elif value_type == 3:
                     value_len = 2
                elif value_type == 4:
                     value_len = 4
                elif value_type == 5:
                     value_len = 4
                elif value_type == 6:
                     value_len = 4
                elif value_type == 7:
                     value_len = 1
                elif value_type == 8:
                     str_len = struct.unpack('<Q', f.read(8))[0]
                     value_bytes = f.read(str_len)
                     value_len = 8 + str_len
                elif value_type == 9:
                    logger.warning("GGUF Array metadata type found - skipping content for basic analysis.")
                    array_type = struct.unpack('<I', f.read(4))[0]
                    array_count = struct.unpack('<Q', f.read(8))[0]
                    value_len = 12
                else:
                    return {"error": f"Unknown GGUF metadata value type: {value_type}"}

                if value_type != 8 and value_type != 9:
                    f.seek(value_len, os.SEEK_CUR)

                try:
                    key_str = key_bytes.decode('utf-8')
                    if key_str.endswith('general.architecture'):
                         if value_type == 8:
                             metadata["architecture"] = value_bytes.decode('utf-8')
                         else:
                             logger.warning(f"Found architecture key '{key_str}' but value type is not String ({value_type}).")
                except UnicodeDecodeError:
                     pass
            return metadata

    except FileNotFoundError:
        return {"error": "File not found", "path_checked": file_path}
    except struct.error as e:
        return {"error": f"Error unpacking GGUF data (possibly corrupted or truncated file): {e}", "file_path": file_path}
    except Exception as e:
        logger.error(f"Unexpected error analyzing GGUF file {file_path}: {e}")
        return {"error": f"Unexpected error analyzing GGUF file: {e}", "file_path": file_path}

def download_gguf_model(url, save_path):
    """Download a GGUF model from a URL to the specified path"""
    try:
        os.makedirs(os.path.dirname(save_path), exist_ok=True)
        logger.info(f"Starting download from {url} to {save_path}")

        with requests.get(url, stream=True, timeout=30) as response:
            response.raise_for_status()

            total_size = int(response.headers.get('content-length', 0))
            block_size = 8192
            downloaded = 0
            last_logged_mb = 0

            if total_size:
                logger.info(f"Total download size: {total_size / (1024 * 1024):.2f} MB")
            else:
                logger.info("Total download size unknown.")

            with open(save_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=block_size):
                    if chunk:
                        f.write(chunk)
                        downloaded += len(chunk)
                        downloaded_mb = downloaded / (1024 * 1024)

                        if total_size > 0 and (downloaded_mb - last_logged_mb >= 100):
                            progress = (downloaded / total_size) * 100
                            logger.info(f"Downloaded: {downloaded_mb:.2f} MB ({progress:.1f}%)")
                            last_logged_mb = downloaded_mb
                        elif total_size == 0 and (downloaded_mb - last_logged_mb >= 100) :
                             logger.info(f"Downloaded: {downloaded_mb:.2f} MB (total size unknown)")
                             last_logged_mb = downloaded_mb


        logger.info(f"Model download complete: {save_path} ({downloaded / (1024 * 1024):.2f} MB)")
        return True

    except requests.exceptions.RequestException as e:
        logger.error(f"Error downloading model from {url}: {e}")
        if os.path.exists(save_path):
            logger.info(f"Removing partially downloaded file: {save_path}")
            os.remove(save_path)
        return False
    except Exception as e:
        logger.error(f"Unexpected error during model download: {e}")
        if os.path.exists(save_path):
             logger.info(f"Removing partially downloaded file due to error: {save_path}")
             os.remove(save_path)
        return False

app = Flask(__name__)
manager = LLMConversationManager()


@app.route('/api/initialize', methods=['POST'])
def initialize_models():
    """Initialize models from configuration"""
    data = request.json
    if not data or 'models' not in data:
        return jsonify({"error": "Missing 'models' list in request body"}), 400

    models_config = data.get('models', [])
    initialized_models = []
    errors = {}

    for model_config in models_config:
        model_id = model_config.get('id')
        model_type = model_config.get('type', 'llama')

        if not model_id:
            logger.warning("Skipping model config with missing 'id'.")
            continue

        try:
            model_path_or_id = model_config.get('path')
            if not model_path_or_id:
                 logger.warning(f"Skipping model '{model_id}': missing 'path' (file path or Hugging Face ID).")
                 errors[model_id] = "Missing 'path' (file path or Hugging Face ID)."
                 continue

            is_likely_path = os.path.sep in model_path_or_id or model_path_or_id.endswith('.gguf')
            full_path_or_id = model_path_or_id

            if is_likely_path:
                 if not os.path.isabs(model_path_or_id):
                     base_dir = os.environ.get('MODEL_DIR', './models')
                     full_path_or_id = os.path.abspath(os.path.join(base_dir, model_path_or_id))
                 else:
                      full_path_or_id = os.path.abspath(model_path_or_id)

                 if not os.path.exists(full_path_or_id):
                      logger.error(f"Model file not found for '{model_id}' at resolved path: {full_path_or_id}")
                      errors[model_id] = f"Model file not found at path: {full_path_or_id}"
                      continue
                 logger.info(f"Using local model path for '{model_id}': {full_path_or_id}")
            else:
                 logger.info(f"Using Hugging Face ID for '{model_id}': {full_path_or_id}")


            context_window = int(model_config.get('context_window', 2048))
            n_threads = int(model_config.get('n_threads', 4))
            n_gpu_layers = int(model_config.get('n_gpu_layers', 0))
            temperature = float(model_config.get('temperature', 0.7))

            logger.info(f"Loading model '{model_id}'...")
            model = LLMModel(
                model_path=full_path_or_id,
                model_type=model_type,
                context_window=context_window,
                n_threads=n_threads,
                n_gpu_layers=n_gpu_layers,
                temperature=temperature
            )

            manager.add_model(model_id, model)
            initialized_models.append(model_id)
            logger.info(f"Successfully loaded model '{model_id}'.")

        except ValueError as ve:
             logger.error(f"Configuration or Value Error initializing model {model_id}: {ve}")
             errors[model_id] = str(ve)
        except ImportError as ie:
             logger.error(f"Import Error initializing model {model_id} (missing dependency?): {ie}")
             errors[model_id] = f"Missing dependency: {ie}"
        except Exception as e:
            logger.error(f"Failed to initialize model {model_id}: {e}", exc_info=True)
            errors[model_id] = f"Unexpected error: {e}"

    status_code = 200 if not errors else 400 if errors and not initialized_models else 207
    return jsonify({
        "success": len(errors) == 0,
        "models_initialized": initialized_models,
        "errors": errors
    }), status_code

@app.route('/api/modify-model/<model_id>', methods=['PUT'])
def modify_model_parameters(model_id):
    """Modify parameters of an existing model."""
    if model_id not in manager.models:
        return jsonify({"error": f"Model '{model_id}' not found"}), 404

    data = request.json
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    # Extract parameters from request
    temperature = data.get('temperature')
    context_window = data.get('context_window')
    n_threads = data.get('n_threads')
    n_gpu_layers = data.get('n_gpu_layers')

    # If no parameters provided to modify, return current info
    if all(param is None for param in [temperature, context_window, n_threads, n_gpu_layers]):
        try:
            model_info = manager.model_info(model_id)
            return jsonify({
                "success": True,
                "message": "No parameters provided to modify. Returning current model info.",
                "model_id": model_id,
                "model_info": model_info
            }), 200
        except ValueError as e:
            return jsonify({"error": str(e)}), 500

    logger.info(f"Modifying parameters for model '{model_id}': {data}")

    model = manager.models[model_id]
    result = model.modify_parameters(
        temperature=temperature,
        context_window=context_window,
        n_threads=n_threads,
        n_gpu_layers=n_gpu_layers
    )

    changes = result["changes"]
    errors = result["errors"]

    try:
        updated_info = manager.model_info(model_id)
    except ValueError as e:
        logger.error(f"Failed to retrieve updated info for model '{model_id}' after modification: {e}")
        updated_info = {"error": str(e)}

    if errors:
        status_code = 400 if not changes else 207  # 207 for partial success
        return jsonify({
            "success": bool(changes),  # True if any change succeeded
            "model_id": model_id,
            "message": "Model parameters partially updated" if changes else "Failed to update model parameters",
            "changes": changes,
            "errors": errors,
            "updated_model_info": updated_info
        }), status_code

    return jsonify({
        "success": True,
        "model_id": model_id,
        "message": "Model parameters updated successfully",
        "changes": changes,
        "updated_model_info": updated_info
    }), 200

@app.route('/api/add-llm', methods=['POST'])
def add_llm_model():
    """Add a new LLM model, potentially downloading it."""
    data = request.json
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    model_id = data.get('model_id')
    model_type = data.get('model_type', 'llama').lower()
    model_source = data.get('model_url') or data.get('model_path')

    context_window = int(data.get('context_window', 2048))
    n_threads = int(data.get('n_threads', 4))
    n_gpu_layers = int(data.get('n_gpu_layers', 0))
    temperature = float(data.get('temperature', 0.7))
    keep_file_on_error = data.get('keep_file_on_error', False)
    download_only = data.get('download_only', False)
    auto_correct_type = data.get('auto_correct_type', True)

    if not model_id:
        return jsonify({"error": "model_id is required"}), 400
    if not model_source:
        return jsonify({"error": "Either model_url or model_path is required"}), 400

    if model_id in manager.models:
        return jsonify({"error": f"Model ID '{model_id}' already exists"}), 409

    is_url = model_source.startswith(('http://', 'https://'))
    is_gguf_expected = model_type == 'llama' or model_source.endswith('.gguf')

    model_dir = os.environ.get('MODEL_DIR', './models')
    os.makedirs(model_dir, exist_ok=True)

    final_model_path = None
    analysis = None
    file_downloaded = False

    if is_url:
        file_name = data.get('file_name')
        if not file_name:
            from urllib.parse import urlparse
            parsed_path = urlparse(model_source).path
            file_name = os.path.basename(parsed_path) if parsed_path else f"{model_id}.gguf"
            if not file_name.endswith(('.gguf','.bin','.pth')):
                 file_name = f"{model_id}.gguf"

        save_path = os.path.abspath(os.path.join(model_dir, file_name))
        logger.info(f"'{model_id}': Provided source is a URL. Downloading to {save_path}")

        if os.path.exists(save_path):
             logger.warning(f"File already exists at {save_path}. Skipping download. Use 'force_download=true' (not implemented) or delete manually if re-download needed.")
             final_model_path = save_path
             file_downloaded = False
        else:
             success = download_gguf_model(model_source, save_path)
             if not success:
                 return jsonify({"error": "Failed to download model from URL"}), 500
             final_model_path = save_path
             file_downloaded = True

        if final_model_path.endswith('.gguf'):
            analysis = analyze_gguf_file(final_model_path)
            if "error" not in analysis and "architecture" in analysis:
                detected_arch = analysis["architecture"]
                logger.info(f"GGUF analysis detected architecture: {detected_arch}")
                corrected = False
                if auto_correct_type:
                     if detected_arch == 'llama' and model_type != 'llama':
                         logger.warning(f"Correcting model_type from '{model_type}' to 'llama' based on GGUF metadata.")
                         model_type = 'llama'
                         corrected = True
                if corrected or (detected_arch != 'unknown' and detected_arch != model_type and model_type=='llama'):
                     logger.info(f"Using model_type '{model_type}' for GGUF file (Architecture: {detected_arch})")


    else:
         is_likely_path = os.path.sep in model_source or model_source.endswith('.gguf')
         if is_likely_path:
              if not os.path.isabs(model_source):
                   resolved_path = os.path.abspath(os.path.join(model_dir, model_source))
              else:
                   resolved_path = os.path.abspath(model_source)

              logger.info(f"'{model_id}': Provided source is a local path. Checking existence: {resolved_path}")
              if not os.path.exists(resolved_path):
                   return jsonify({"error": f"Model file not found at specified path: {resolved_path}"}), 404
              final_model_path = resolved_path

              if final_model_path.endswith('.gguf'):
                  analysis = analyze_gguf_file(final_model_path)
                  if "error" not in analysis and "architecture" in analysis:
                     detected_arch = analysis["architecture"]
                     logger.info(f"GGUF analysis detected architecture: {detected_arch}")
                     if auto_correct_type:
                          if detected_arch == 'llama' and model_type != 'llama':
                              logger.warning(f"Correcting model_type from '{model_type}' to 'llama' based on GGUF metadata.")
                              model_type = 'llama'
                     if detected_arch != 'unknown' and detected_arch != model_type and model_type=='llama':
                          logger.info(f"Using model_type '{model_type}' for GGUF file (Architecture: {detected_arch})")

         else:
              logger.info(f"'{model_id}': Provided source is assumed to be a Hugging Face ID: {model_source}")
              final_model_path = model_source
              if model_type == 'llama':
                  logger.warning(f"Model type 'llama' specified for HF ID '{model_source}'. This usually requires a local GGUF file. Attempting load, but might fail if not a GGUF.")


    if download_only:
        return jsonify({
            "success": True,
            "message": "Model downloaded (or found locally) successfully but not loaded.",
            "model_id": model_id,
            "file_path": final_model_path if file_downloaded or is_likely_path else "N/A (Hugging Face ID)",
            "analysis": analysis or "N/A (Not a GGUF or analysis failed)"
        }), 200

    logger.info(f"Attempting to load model '{model_id}' with type '{model_type}' from source '{final_model_path}'...")
    try:
        model = LLMModel(
            model_path=final_model_path,
            model_type=model_type,
            context_window=context_window,
            n_threads=n_threads,
            n_gpu_layers=n_gpu_layers,
            temperature=temperature
        )

        manager.add_model(model_id, model)
        logger.info(f"Successfully loaded and added model '{model_id}'.")
        model_info_dict = manager.model_info(model_id)

        return jsonify({
            "success": True,
            "model_id": model_id,
            "message": f"Model '{model_id}' added successfully.",
            "file_path": final_model_path if os.path.exists(final_model_path) else "N/A (Hugging Face ID)",
            "model_info": model_info_dict,
            "analysis": analysis or "N/A (Not applicable or failed)"
        }), 201

    except Exception as e:
        error_msg = str(e)
        logger.error(f"Failed to load model '{model_id}' from '{final_model_path}': {error_msg}", exc_info=True)

        file_status = "No file downloaded or specified."
        if file_downloaded and final_model_path and os.path.exists(final_model_path):
            if not keep_file_on_error:
                try:
                    logger.info(f"Removing downloaded file due to load error: {final_model_path}")
                    os.remove(final_model_path)
                    file_status = "Downloaded file was removed due to error. Set 'keep_file_on_error: true' to keep it."
                except OSError as rm_err:
                    logger.error(f"Failed to remove file {final_model_path}: {rm_err}")
                    file_status = f"Downloaded file at {final_model_path} was kept (failed to remove)."
            else:
                file_status = f"Downloaded file was kept at {final_model_path} as requested."
        elif final_model_path and os.path.exists(final_model_path):
             file_status = f"Existing local file at {final_model_path} was not modified."


        suggestion = "Check model compatibility, required libraries (llama-cpp-python, transformers, rwkv, optimum), file integrity, and available resources (RAM/VRAM)."
        if "ModuleNotFoundError" in error_msg:
            suggestion = f"A required library is missing. Try installing ..."
        elif "invalid GGUF file" in error_msg or "magic mismatch" in error_msg:
            suggestion = "The file seems corrupted or is not a valid GGUF file. Try re-downloading or verifying the source."
        elif "out of memory" in error_msg.lower():
             suggestion = "Not enough RAM or VRAM to load the model. Try reducing 'n_gpu_layers', using quantization (like 4-bit if supported), or using a smaller model."
        elif "unknown model architecture" in error_msg:
            suggestion = "The GGUF file uses an architecture not supported by the currently installed llama-cpp-python version."
        elif "trust_remote_code" in error_msg:
             suggestion = "The Hugging Face model requires 'trust_remote_code=True'. Ensure the LLMModel class sets this during loading if applicable (check Phi-2 loading section)."


        return jsonify({
            "error": f"Failed to load model '{model_id}': {error_msg}",
            "file_status": file_status,
            "suggestion": suggestion,
            "analysis": analysis or "N/A"
        }), 500

@app.route('/api/delete-llm/<model_id>', methods=['DELETE'])
def delete_llm_model(model_id):
    """Delete an LLM model and clean up associated resources."""
    if model_id not in manager.models:
        return jsonify({"error": f"Model '{model_id}' not found"}), 404

    logger.info(f"Received request to delete model: {model_id}")

    model_path_to_delete = None
    try:
        model_info = manager.model_info(model_id)
        if 'model_path' in model_info and os.path.exists(model_info['model_path']) and os.path.isfile(model_info['model_path']):
             model_path_to_delete = model_info['model_path']
    except ValueError:
         model_info = {"id": model_id, "error": "Could not retrieve full info before deletion."}


    success = manager.remove_model(model_id)

    if success:
         delete_file = request.args.get('delete_file', 'false').lower() == 'true'
         file_deleted_msg = ""
         if delete_file and model_path_to_delete:
             try:
                 logger.info(f"Deleting model file: {model_path_to_delete}")
                 os.remove(model_path_to_delete)
                 file_deleted_msg = f" Model file '{model_path_to_delete}' also deleted."
                 logger.info(f"Successfully deleted model file: {model_path_to_delete}")
             except OSError as e:
                 logger.error(f"Failed to delete model file {model_path_to_delete}: {e}")
                 file_deleted_msg = f" Failed to delete model file '{model_path_to_delete}': {e}."
         elif delete_file:
             file_deleted_msg = " Could not delete file (path unknown or not a file)."


         return jsonify({
             "success": True,
             "model_id": model_id,
             "message": f"Model '{model_id}' and associated conversations removed successfully.{file_deleted_msg}"
         }), 200
    else:
        return jsonify({"error": f"Failed to remove model '{model_id}' during manager operation"}), 500

@app.route('/api/models', methods=['GET'])
def list_models():
    """List all available models with their information"""
    models_info = {}
    for model_id in list(manager.models.keys()):
        try:
            models_info[model_id] = manager.model_info(model_id)
        except Exception as e:
            logger.error(f"Error retrieving info for model {model_id}: {e}")
            models_info[model_id] = {"id": model_id, "error": f"Failed to retrieve info: {e}"}
    return jsonify(models_info)

@app.route('/api/conversations', methods=['GET'])
def list_conversations():
    """List all active conversations"""
    return jsonify({
        conv_id: {
            "model_id": data.get("model_id", "Unknown"),
            "message_count": len(data.get("history", []))
        }
        for conv_id, data in manager.conversations.items()
    })

@app.route('/api/conversation', methods=['POST'])
def create_conversation():
    """Create a new conversation"""
    data = request.json
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    model_id = data.get('model_id')
    conversation_id = data.get('conversation_id')

    if not model_id:
        return jsonify({"error": "model_id is required"}), 400

    try:
        conv_id = manager.create_conversation(model_id, conversation_id)
        logger.info(f"Conversation '{conv_id}' created successfully for model '{model_id}'.")
        return jsonify({"conversation_id": conv_id}), 201
    except ValueError as e:
        if "Model" in str(e) and "not found" in str(e):
             return jsonify({"error": str(e)}), 404
        else:
             return jsonify({"error": str(e)}), 400


@app.route('/api/conversation/<conversation_id>', methods=['GET'])
def get_conversation(conversation_id):
    """Get the history of a specific conversation"""
    try:
        history = manager.get_conversation_history(conversation_id)
        model_id = manager.conversations[conversation_id].get("model_id", "Unknown")
        return jsonify({
            "conversation_id": conversation_id,
            "model_id": model_id,
            "history": history
            })
    except ValueError as e:
        return jsonify({"error": str(e)}), 404


@app.route('/api/conversation/<conversation_id>/reset', methods=['POST'])
def reset_conversation(conversation_id):
    """Reset a conversation's history"""
    try:
        manager.reset_conversation(conversation_id)
        return jsonify({"success": True, "message": f"Conversation '{conversation_id}' reset."})
    except ValueError as e:
        return jsonify({"error": str(e)}), 404


@app.route('/api/chat', methods=['POST'])
def chat():
    """Send a message to a conversation and get a response (uses ThreadPoolExecutor)"""
    data = request.json
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    conversation_id = data.get('conversation_id')
    message = data.get('message')

    if not conversation_id:
        return jsonify({"error": "conversation_id is required"}), 400
    if not message:
        return jsonify({"error": "message is required"}), 400
    if not isinstance(message, str):
        return jsonify({"error": "message must be a string"}), 400


    try:
        def generate_response_sync(conv_id, msg):
            logger.info(f"Submitting generation task for conv '{conv_id}' to executor.")
            return manager.get_response(conv_id, msg)

        future = executor.submit(generate_response_sync, conversation_id, message)

        response = future.result()
        logger.info(f"Received result from executor for conv '{conversation_id}'.")

        if response.startswith("Error generating response from model"):
             return jsonify({
                 "conversation_id": conversation_id,
                 "error": response
             }), 500

        return jsonify({
            "conversation_id": conversation_id,
            "response": response
        })

    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        logger.error(f"Error in chat endpoint handler for conv '{conversation_id}': {e}", exc_info=True)
        return jsonify({"error": f"Internal server error processing chat request: {e}"}), 500


@app.route('/api/analyze-model', methods=['POST'])
def analyze_model():
    """Analyze a local GGUF model file before loading"""
    data = request.json
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    model_path = data.get('model_path')
    if not model_path:
        return jsonify({"error": "model_path is required"}), 400

    if not os.path.isabs(model_path):
        base_dir = os.environ.get('MODEL_DIR', './models')
        full_path = os.path.abspath(os.path.join(base_dir, model_path))
    else:
        full_path = os.path.abspath(model_path)

    logger.info(f"Analyzing model file at: {full_path}")

    if not os.path.exists(full_path):
        return jsonify({"error": "Model file not found at the specified path", "path_checked": full_path}), 404
    if not os.path.isfile(full_path):
         return jsonify({"error": "Specified path is not a file", "path_checked": full_path}), 400
    if not model_path.endswith('.gguf'):
        return jsonify({"warning": "File does not end with .gguf, analysis might fail or be irrelevant.", "path_checked": full_path}), 200

    analysis = analyze_gguf_file(full_path)

    if "error" not in analysis and "architecture" in analysis:
        arch = analysis["architecture"]
        if arch in ['llama', 'starcoder', 'falcon', 'mpt', 'gptneox', 'gptj', 'gpt2', 'phi2', 'baichuan', 'mistral', 'gemma', 'rwkv']:
            analysis["recommendation"] = f"Detected architecture '{arch}'. Use 'model_type: llama' when adding this model for llama.cpp."
        elif arch != 'unknown':
            analysis["recommendation"] = f"Detected architecture '{arch}'. Compatibility with 'model_type: llama' depends on your llama-cpp-python version support."
        else:
             analysis["recommendation"] = "Could not detect architecture from metadata. Ensure it's compatible with the chosen 'model_type'."

    status_code = 200 if "error" not in analysis else 400
    return jsonify(analysis), status_code

@app.route('/health', methods=['GET'])
def health_check():
    """Basic health check endpoint"""
    model_count = len(manager.models)
    return jsonify({
        "status": "healthy",
        "loaded_models": model_count,
        "active_conversations": len(manager.conversations),
        "pending_generation_tasks": executor._work_queue.qsize() if hasattr(executor, '_work_queue') else 'N/A'
        })

if __name__ == "__main__":
    print("="*50)
    print(" ERROR: Running with 'python app.py' is for DEVELOPMENT ONLY!")
    print(" Use a production WSGI server like Gunicorn for deployment.")
    print(" Example Gunicorn command:")
    print("   gunicorn --workers 4 --threads 2 --timeout 120 --bind 0.0.0.0:5000 app:app")
    print(" Adjust --workers, --threads, and --timeout based on your server resources and model inference times.")
    print(" See README or documentation for more details on deployment.")
    print("="*50)
    app.run(host='0.0.0.0', port=5000, debug=False)
