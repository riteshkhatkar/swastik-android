import os
path = "e:/swastik-hospital/backend/.env"
if os.path.exists(path):
    with open(path, 'r') as f:
        print(f.read())
else:
    print(f"File {path} not found")
    print("Files in backend:")
    print(os.listdir("e:/swastik-hospital/backend"))
