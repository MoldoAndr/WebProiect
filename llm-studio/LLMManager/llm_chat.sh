#!/bin/bash

# Configuration
API_URL="http://127.0.0.1:5000"

# Function to display usage information
show_usage() {
    echo "LLM Chat Client"
    echo "Usage:"
    echo "  $0 list                             - List available models"
    echo "  $0 list-conversations               - List all conversations"
    echo "  $0 create <model_id> [conv_id]      - Create a new conversation"
    echo "  $0 chat <conv_id> \"<message>\"       - Send a message to a conversation"
    echo "  $0 history <conv_id>                - Get conversation history"
    echo "  $0 reset <conv_id>                  - Reset a conversation"
    echo "  $0 modify <model_id> [temp] [ctx] [threads] [gpu_layers] - Modify model parameters"
    echo
    echo "Examples:"
    echo "  $0 list"
    echo "  $0 create phi2 my_philosophy_chat"
    echo "  $0 chat my_philosophy_chat \"What is the meaning of life?\""
    echo "  $0 history my_philosophy_chat"
    echo "  $0 modify phi2 0.9 4096 8 0  - Set temperature=0.9, context_window=4096, threads=8, gpu_layers=0"
    echo "  $0 modify phi2 0.8            - Set only temperature=0.8"
}

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo "Error: jq is required but not installed. Please install jq to use this script."
    exit 1
fi

# Process commands
case "$1" in
    list)
        echo "Available models:"
        curl -s -X GET "$API_URL/api/models" | jq
        ;;
        
    list-conversations)
        echo "Active conversations:"
        curl -s -X GET "$API_URL/api/conversations" | jq
        ;;
        
    create)
        if [ -z "$2" ]; then
            echo "Error: Model ID is required"
            show_usage
            exit 1
        fi
        
        model_id="$2"
        conv_id="${3:-$model_id-$(date +%s)}"
        
        echo "Creating conversation '$conv_id' with model '$model_id'..."
        response=$(curl -s -X POST "$API_URL/api/conversation" \
            -H "Content-Type: application/json" \
            -d "{
                \"model_id\": \"$model_id\",
                \"conversation_id\": \"$conv_id\"
            }")
        
        echo "$response" | jq
        ;;
        
    chat)
        if [ -z "$2" ] || [ -z "$3" ]; then
            echo "Error: Conversation ID and message are required"
            show_usage
            exit 1
        fi
        
        conv_id="$2"
        message="$3"
        
        echo "Sending message to conversation '$conv_id'..."
        echo "Message: $message"
        echo "Waiting for response..."
        
        response=$(curl -s -X POST "$API_URL/api/chat" \
            -H "Content-Type: application/json" \
            -d "{
                \"conversation_id\": \"$conv_id\",
                \"message\": \"$message\"
            }")
        
        echo -e "\nLLM Response:"
        echo "$response" | jq -r '.response'
        ;;
        
    history)
        if [ -z "$2" ]; then
            echo "Error: Conversation ID is required"
            show_usage
            exit 1
        fi
        
        conv_id="$2"
        
        echo "Getting history for conversation '$conv_id'..."
        curl -s -X GET "$API_URL/api/conversation/$conv_id" | jq
        ;;
        
    reset)
        if [ -z "$2" ]; then
            echo "Error: Conversation ID is required"
            show_usage
            exit 1
        fi
        
        conv_id="$2"
        
        echo "Resetting conversation '$conv_id'..."
        curl -s -X POST "$API_URL/api/conversation/$conv_id/reset" | jq
        ;;
        
    modify)
        if [ -z "$2" ]; then
            echo "Error: Model ID is required"
            show_usage
            exit 1
        fi
        
        model_id="$2"
        temperature="$3"
        context_window="$4"
        n_threads="$5"
        n_gpu_layers="$6"
        
        # Build JSON payload dynamically based on provided arguments
        payload="{ \"model_id\": \"$model_id\""
        if [ -n "$temperature" ]; then
            payload="$payload, \"temperature\": $temperature"
        fi
        if [ -n "$context_window" ]; then
            payload="$payload, \"context_window\": $context_window"
        fi
        if [ -n "$n_threads" ]; then
            payload="$payload, \"n_threads\": $n_threads"
        fi
        if [ -n "$n_gpu_layers" ]; then
            payload="$payload, \"n_gpu_layers\": $n_gpu_layers"
        fi
        payload="$payload }"
        
        echo "Modifying model '$model_id' with parameters:"
        echo "$payload" | jq
        
        response=$(curl -s -X PUT "$API_URL/api/modify-model/$model_id" \
            -H "Content-Type: application/json" \
            -d "$payload")
        
        echo "Response:"
        echo "$response" | jq
        ;;
        
    *)
        show_usage
        ;;
esac
