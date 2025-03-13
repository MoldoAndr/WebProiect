# run_tests.py
import pytest
import os
import sys

def run_tests():
    """Run all tests"""
    # Arguments for pytest
    args = [
        "-v",  # Verbose output
        "--cov=app",  # Coverage for app directory
        "--cov-report=term",  # Report format
        "--cov-report=html",  # HTML report
        "test_backend_api.py",
        "test_llm_api.py",
        "test_database.py",
        "test_integration.py"
    ]
    
    # Run tests
    return pytest.main(args)

if __name__ == "__main__":
    # Ensure we're in the right directory
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    sys.exit(run_tests())
