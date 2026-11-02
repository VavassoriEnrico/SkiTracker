from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db_dependency import get_db
from app.dependency_auth import get_current_user
from app.schemas.ski_customer import SkiCustomerCreate, SkiCustomerPhoto, SkiCustomerRead, SkiCustomerUpdate
from app.services.ski_customer_service import create_customer, get_clients, get_customer, update_client, update_customer, update_customer_photo

from app.services.ski_instructor_service import get_or_create_instructor

router = APIRouter(prefix="/ski_customer", tags=["ski_customer"])


@router.get("/me", response_model=SkiCustomerRead)
def get_my_customer(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return get_customer(db, user_id=UUID(current_user["id"]))


@router.patch("/me", response_model=SkiCustomerRead)
def update_my_customer(
    payload: SkiCustomerUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return update_customer(
        db,
        user_id=UUID(current_user["id"]),
        name=payload.name,
        surname=payload.surname,
        username=payload.username,
        birth_date=payload.birth_date,
        sex=payload.sex,
        level=payload.level,
        ability=payload.ability,
    )


@router.post("", response_model=SkiCustomerRead, status_code=201)
def create_client(
    payload: SkiCustomerCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    get_or_create_instructor(db, user_id=UUID(current_user["id"]), email=current_user.get("email"))
    return create_customer(db, payload=payload)


@router.get("", response_model=list[SkiCustomerRead])
def list_clients(
    q: str = Query(default="", max_length=200),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    get_or_create_instructor(db, user_id=UUID(current_user["id"]), email=current_user.get("email"))
    return get_clients(db, search=q)


@router.get("/{customer_id}", response_model=SkiCustomerRead)
def get_client(
    customer_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    get_or_create_instructor(db, user_id=UUID(current_user["id"]), email=current_user.get("email"))
    return get_customer(db, user_id=customer_id)


@router.post("/{customer_id}/photo", response_model=SkiCustomerRead)
def upload_client_photo(
    customer_id: UUID,
    payload: SkiCustomerPhoto,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    get_or_create_instructor(db, user_id=UUID(current_user["id"]), email=current_user.get("email"))
    return update_customer_photo(db, customer_id=customer_id, image_base64=payload.image_base64)


@router.patch("/{customer_id}", response_model=SkiCustomerRead)
def edit_client(
    customer_id: UUID,
    payload: SkiCustomerUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    get_or_create_instructor(db, user_id=UUID(current_user["id"]), email=current_user.get("email"))
    return update_client(db, customer_id=customer_id, payload=payload)
