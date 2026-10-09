import os
from pymongo import MongoClient
from dotenv import load_dotenv

def clear_hospital_data():
    # Load environment variables
    load_dotenv()
    
    mongo_uri = os.getenv("MONGO_URI", "mongodb+srv://swastikAdmin:Admin%40123@swastikdata.nmey2l2.mongodb.net/?retryWrites=true&w=majority&appName=Swastikdata")
    db_name = os.getenv("DB_NAME", "Swastik_Hospital")
    
    print(f"Connecting to database: {db_name}")
    client = MongoClient(mongo_uri)
    db = client[db_name]
    
    collections_to_clear = [
        "patients",
        "opd_registrations",
        "ipd_registrations",
        "appointments",
        "clinical_records",
        "lab_requests",
        "patient_documents",
        "activity_logs"
    ]
    
    for collection_name in collections_to_clear:
        print(f"Clearing collection: {collection_name}...")
        result = db[collection_name].delete_many({})
        print(f"Deleted {result.deleted_count} documents from {collection_name}.")
    
    print("\nData clearing complete. Master data (doctors, staff, users) preserved.")
    client.close()

if __name__ == "__main__":
    clear_hospital_data()
