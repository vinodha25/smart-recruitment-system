
import sys
import os

sys.path.append(os.getcwd())

try:
    print("Importing app.routers.candidates...")
    from app.routers import candidates
    print("Import successful.")
except Exception as e:
    print(f"Import FAILED: {e}")
    import traceback
    traceback.print_exc()
