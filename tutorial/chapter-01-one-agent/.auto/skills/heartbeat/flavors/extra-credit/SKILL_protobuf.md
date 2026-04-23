---
name: heartbeat
description: Record that an agent ran you. Any agent may fulfil this.
metadata:
  automate/outputSchema:
    kind: proto
    file: ./heartbeat.proto
    message: Ran
---

# Heartbeat (protobuf flavor)

Contract lives in a `.proto` file. A protobuf runtime can validate and encode
facts; a non-proto runtime reads the equivalent JSON form.

## Companion `heartbeat.proto`

```proto
syntax = "proto3";
package heartbeat;

message Ran {
  string id = 1;         // 12 hex chars
  string at = 2;         // ISO 8601
  string by = 3;         // agent id
  string kind = 4;       // always "Ran"
  Payload payload = 5;

  message Payload {
    string runner = 1;
  }
}
```

## When to use this flavor

- Your agents are already speaking gRPC / protobuf internally.
- You want a single schema definition that works across Go, Rust, Python, TS.
- You want wire-format compactness if facts ever travel over the network.

The log stays JSONL on disk; the proto describes its logical shape.
