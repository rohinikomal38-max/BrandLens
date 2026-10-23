from app.database import create_tables, engine
from sqlalchemy import inspect


def main():
    print("Creating BrandLens database tables...")

    create_tables()

    inspector = inspect(engine)
    tables = inspector.get_table_names()

    print("\nDatabase tables created successfully:")

    for table in tables:
        print(f"- {table}")

    expected_tables = {
        "brand_rules",
        "drafts",
        "review_findings",
        "review_decisions",
    }

    missing_tables = expected_tables - set(tables)

    if missing_tables:
        print("\nMissing tables:")
        for table in sorted(missing_tables):
            print(f"- {table}")
    else:
        print("\nSUCCESS: All four expected tables exist.")


if __name__ == "__main__":
    main()