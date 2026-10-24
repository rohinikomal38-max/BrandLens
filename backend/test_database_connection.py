from app.database import engine

try:
    with engine.connect() as connection:
        print("BrandLens database connection successful!")

    print(f"Database URL: {engine.url}")

except Exception as error:
    print("Database connection failed.")
    print(f"Error: {error}")