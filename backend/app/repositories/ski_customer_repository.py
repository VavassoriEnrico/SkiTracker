from datetime import date
from uuid import UUID

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.models.ski_customer import SkiCustomer


def get_by_id(db: Session, customer_id: UUID) -> SkiCustomer | None:
    return db.query(SkiCustomer).filter(SkiCustomer.id == customer_id).first()


def create(
    db: Session,
    *,
    customer_id: UUID,
    email: str | None = None,
    name: str | None = None,
    surname: str | None = None,
    username: str | None = None,
    birth_date: date | None = None,
    sex: str | None = None,
    level: int | None = None,
    ability: int | None = None,
) -> SkiCustomer:
    customer = SkiCustomer(
        id=customer_id,
        email=email,
        name=name,
        surname=surname,
        username=username,
        birth_date=birth_date,
        sex=sex,
        level=level,
        ability=ability,
    )
    db.add(customer)
    db.flush()
    return customer


def update_fields(
    db: Session,
    customer: SkiCustomer,
    *,
    name: str | None = None,
    surname: str | None = None,
    username: str | None = None,
    birth_date: date | None = None,
    sex: str | None = None,
    level: int | None = None,
    ability: int | None = None,
) -> SkiCustomer:
    if name is not None:
        customer.name = name
    if surname is not None:
        customer.surname = surname
    if username is not None:
        customer.username = username
    if birth_date is not None:
        customer.birth_date = birth_date
    if sex is not None:
        customer.sex = sex
    if level is not None:
        customer.level = level
    if ability is not None:
        customer.ability = ability

    db.add(customer)
    return customer


def get_all(db: Session, search: str = "") -> list[SkiCustomer]:
    query = db.query(SkiCustomer)
    if search.strip():
        text = search.strip().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        pattern = f"%{text}%"
        full_name = func.coalesce(SkiCustomer.name, "") + " " + func.coalesce(SkiCustomer.surname, "")
        query = query.filter(or_(
            SkiCustomer.name.ilike(pattern, escape="\\"),
            SkiCustomer.surname.ilike(pattern, escape="\\"),
            full_name.ilike(pattern, escape="\\"),
            SkiCustomer.username.ilike(pattern, escape="\\"),
            SkiCustomer.email.ilike(pattern, escape="\\"),
        ))
    return query.order_by(SkiCustomer.surname, SkiCustomer.name, SkiCustomer.id).all()


def update_partial(db: Session, customer: SkiCustomer, fields: dict) -> SkiCustomer:
    for name, value in fields.items():
        setattr(customer, name, value)
    db.add(customer)
    return customer
