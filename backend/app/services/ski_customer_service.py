import base64
import binascii

from datetime import date

from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.ski_customer import SkiCustomer
from app.repositories import ski_customer_repository
from app.schemas.ski_customer import SkiCustomerCreate, SkiCustomerUpdate
from app.services import supabase_admin

def get_or_create_customer(
    db: Session,
    *,
    user_id: UUID,
    username: str | None = None,
    name: str | None = None, 
    surname: str | None = None, 
    birth_date: date | None = None, 
    sex: str | None = None, 
    level: int | None = None, 
    ability: int | None = None,
) -> SkiCustomer:
    customer = ski_customer_repository.get_by_id(db, user_id)
    
    if customer is not None: 
        return customer
    
    customer = ski_customer_repository.create(
        db,
        customer_id=user_id,
        username=username,
        name=name,
        surname=surname,
        birth_date=birth_date,
        sex=sex,
        level=level,
        ability=ability,
        
    )
    db.commit()
    db.refresh(customer)

    
    return customer


def get_customer(db: Session, *, user_id: UUID) -> SkiCustomer:
    customer = ski_customer_repository.get_by_id(db, user_id)
    if customer is None:
        raise HTTPException(status_code=404, detail="Customer not found.")
    return customer


def update_customer(
    db: Session,
    *,
    user_id: UUID,
    name: str | None = None,
    surname: str | None = None,
    username: str | None = None,
    birth_date: date | None = None,
    sex: str | None = None,
    level: int | None = None,
    ability: int | None = None,
) -> SkiCustomer:
    customer = get_customer(db, user_id=user_id)
    ski_customer_repository.update_fields(
        db,
        customer,
        name=name,
        surname=surname,
        username=username,
        birth_date=birth_date,
        sex=sex,
        level=level,
        ability=ability,
    )
    db.commit()
    db.refresh(customer)
    return customer


def create_customer(db: Session, *, payload: SkiCustomerCreate) -> SkiCustomer:
    user_id = supabase_admin.create_user(payload.email, payload.password.get_secret_value())
    try:
        customer = ski_customer_repository.create(
            db,
            customer_id=user_id,
            **payload.model_dump(exclude={"password"}),
        )
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        try:
            supabase_admin.delete_user(user_id)
        except HTTPException:
            raise HTTPException(status_code=503, detail="The login account was created, but the client profile could not be saved. Check Supabase Auth before retrying.") from None
        raise HTTPException(status_code=503, detail="Unable to save the client. No new account was kept. Try again.") from None
    return customer


def get_clients(db: Session, *, search: str = "") -> list[SkiCustomer]:
    return ski_customer_repository.get_all(db, search)


def update_customer_photo(db: Session, *, customer_id: UUID, image_base64: str) -> SkiCustomer:
    customer = get_customer(db, user_id=customer_id)
    try:
        photo = base64.b64decode(image_base64, validate=True)
    except (binascii.Error, ValueError):
        raise HTTPException(status_code=400, detail="Invalid profile photo.") from None
    if not photo.startswith(b"\xff\xd8"):
        raise HTTPException(status_code=400, detail="Choose a JPEG profile photo.")
    if len(photo) > 5 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Choose a photo smaller than 5 MB.")
    customer.profile_image_url = supabase_admin.upload_customer_photo(customer_id, photo)
    db.commit()
    db.refresh(customer)
    return customer


def update_client(db: Session, *, customer_id: UUID, payload: SkiCustomerUpdate) -> SkiCustomer:
    customer = get_customer(db, user_id=customer_id)
    ski_customer_repository.update_partial(db, customer, payload.model_dump(exclude_unset=True))
    db.commit()
    db.refresh(customer)
    return customer
