import json
from qwen_agent.agents import Assistant

# --- Configuration ---
llm_cfg = {
    'model': 'gemini-2.5-flash',
    'model_server': 'http://localhost:4000/v1',
    'api_key': 'sk-no-key-required',
}

mcp_server_url = "http://127.0.0.1:9029/sse"
USER_ID = "test-user-clado"

# --- Agent Setup ---
tools = [{
    "mcpServers": {
        "clado_server": {
            "url": mcp_server_url,
            "headers": {"X-User-ID": USER_ID},
        }
    }
}]

print("Initializing Qwen agent for Clado...")
agent = Assistant(
    llm=llm_cfg,
    function_list=tools,
    name="CladoAgent",
    description="An agent that can search for and enrich professional profiles.",
    system_message="You are a helpful research assistant. Use the available Clado tools to find people on LinkedIn and enrich their profiles with contact information."
)

# --- Interactive Chat Loop ---
def run_agent_interaction():
    print("\n--- Clado Agent Ready ---")
    print("Ask me to find people or enrich profiles.")
    print("Type 'quit' or 'exit' to end the session.")
    print("\nExample commands:")
    print("  - find software engineers at Google")
    print("  - get contact info for linkedin.com/in/williamhgates")
    print("  - check my Clado credits")
    print("-" * 25)

    messages = []
    while True:
        try:
            print("\nYou: ", end="")
            user_input = input()
            if user_input.lower() in ["quit", "exit", "q"]:
                print("\n👋  Goodbye!")
                break

            messages.append({'role': 'user', 'content': user_input})
            print("\nAgent: ", end="", flush=True)
            
            last_assistant_text = ""
            final_assistant_message = None
            for response in agent.run(messages=messages):
                if isinstance(response, list) and response and response[-1].get("role") == "assistant":
                    current_text = response[-1].get("content", "")
                    if isinstance(current_text, str):
                        delta = current_text[len(last_assistant_text):]
                        print(delta, end="", flush=True)
                        last_assistant_text = current_text
                    final_assistant_message = response[-1]

            print()
            if final_assistant_message:
                messages.append(final_assistant_message)
            else:
                print("I could not process that request.")
                messages.pop()

        except KeyboardInterrupt:
            print("\n👋  Goodbye!")
            break
        except Exception as e:
            print(f"\nAn error occurred: {e}")

if __name__ == "__main__":
    run_agent_interaction()