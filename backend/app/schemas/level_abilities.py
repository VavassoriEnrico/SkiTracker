from pydantic import BaseModel, ConfigDict

class LevelAbilityRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    level_id: int
    ability_number: int
    name: str