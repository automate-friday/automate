---
name: heartbeat
description: Record that an agent ran you. Any agent may fulfil this.
metadata:
  automate/outputSchema:
    kind: pydantic
    module: ./heartbeat.py
    class: Ran
---

# Heartbeat (Pydantic flavor)

Contract is a Pydantic v2 model. Python agents validate facts by
`Ran.model_validate_json(line)`; non-Python runtimes consume the
`Ran.model_json_schema()` export.

## Companion `heartbeat.py`

```python
from typing import Literal
from pydantic import BaseModel, Field

class Payload(BaseModel):
    runner: str = Field(min_length=1)

class Ran(BaseModel):
    id: str = Field(pattern=r"^[0-9a-f]{12}$")
    at: str  # ISO 8601
    by: str = Field(min_length=1)
    kind: Literal["Ran"]
    payload: Payload
```

## When to use this flavor

- Your agents are Python (FastAPI, pytest, Jupyter, data-science stacks).
- You want runtime validation with rich error messages out of the box.
- You plan to cross-publish JSON Schema via `Ran.model_json_schema()` for
  non-Python consumers.

Pydantic and Zod are structural twins; facts round-trip cleanly between them.
