---
name: heartbeat
description: Record that an agent ran you. Any agent may fulfil this.
metadata:
  automate/outputSchema:
    kind: ecto
    module: ./heartbeat.ex
    schema: Heartbeat.Ran
---

# Heartbeat (Ecto flavor)

Contract is an Ecto embedded schema + changeset. Elixir/Phoenix agents
validate incoming facts with `Ran.changeset/2`; constraints live on the
changeset itself.

## Companion `heartbeat.ex`

```elixir
defmodule Heartbeat.Payload do
  use Ecto.Schema
  import Ecto.Changeset

  embedded_schema do
    field :runner, :string
  end

  def changeset(p, attrs),
    do: p |> cast(attrs, [:runner]) |> validate_required([:runner])
end

defmodule Heartbeat.Ran do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key false
  embedded_schema do
    field :id,   :string
    field :at,   :string
    field :by,   :string
    field :kind, :string, default: "Ran"
    embeds_one :payload, Heartbeat.Payload
  end

  def changeset(r, attrs) do
    r
    |> cast(attrs, [:id, :at, :by, :kind])
    |> cast_embed(:payload)
    |> validate_format(:id, ~r/^[0-9a-f]{12}$/)
    |> validate_inclusion(:kind, ["Ran"])
  end
end
```

## When to use this flavor

- You run agents on the BEAM (Elixir, Phoenix, Broadway pipelines).
- You want the same validator that guards your database writes to guard fact
  appends.
- You already ship Ecto schemas as the source of truth.
