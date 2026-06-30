"""Add missing columns to students table and drop nrp unique constraint."""
from sqlalchemy import inspect, text
from app.db.session import engine


def run():
    inspector = inspect(engine)
    existing_cols = {c["name"] for c in inspector.get_columns("students")}
    indexes = inspector.get_indexes("students")
    dialect = engine.dialect.name
    added = []

    with engine.connect() as conn:
        if "longitude" not in existing_cols:
            t = "FLOAT" if dialect == "sqlite" else "DOUBLE PRECISION"
            conn.execute(text(f"ALTER TABLE students ADD COLUMN longitude {t}"))
            added.append("longitude")

        if "latitude" not in existing_cols:
            t = "FLOAT" if dialect == "sqlite" else "DOUBLE PRECISION"
            conn.execute(text(f"ALTER TABLE students ADD COLUMN latitude {t}"))
            added.append("latitude")

        if "captured_at" not in existing_cols:
            t = "DATETIME" if dialect == "sqlite" else "TIMESTAMP"
            conn.execute(text(f"ALTER TABLE students ADD COLUMN captured_at {t}"))
            added.append("captured_at")

        if "user_id" not in existing_cols:
            if dialect == "sqlite":
                conn.execute(text("ALTER TABLE students ADD COLUMN user_id VARCHAR"))
            else:
                conn.execute(text("ALTER TABLE students ADD COLUMN user_id VARCHAR REFERENCES users(id)"))
            added.append("user_id")

        # Drop unique index on nrp (now scoped by user_id)
        for idx in indexes:
            if idx["name"] == "ix_students_nrp" and idx.get("unique"):
                conn.execute(text("DROP INDEX ix_students_nrp"))
                print("  Dropped unique index on nrp")
                break

        conn.commit()

    if added:
        print(f"✓ Added columns to {dialect}: {', '.join(added)}")
    else:
        print(f"✓ All columns already exist ({dialect}). Nothing to do.")


if __name__ == "__main__":
    run()
