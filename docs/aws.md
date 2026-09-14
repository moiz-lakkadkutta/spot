# AWS usage — Spot

        Every call, why it is load-bearing, and its approximate cost. Kept current; judges read this for the AWS Builder mini-challenge.

        | Service | Region | Used for | Approx. cost |
        |---|---|---|---|
        | Amazon Bedrock — Nova Lite (via Strands TS) | us-east-1 | Today's plan from programme template + last results (schema-validated); weekly plain-language summary (blocklist-checked) | cents |
| Amazon Polly (neural) | eu-central-1 | Pre-generated voice bank (~120 cue phrases, de-DE Vicki / en-US Joanna), cached in S3 | cents, once |
| Amazon S3 + CloudFront | eu-central-1 | Voice bank + exercise demo loops | cents |
| Bedrock AgentCore Runtime (stretch) | us-east-1 | Hosts the planning agent | pay-per-use |
| AWS CDK | — | `infra/` | — |

        Infra as code: `infra/` (AWS CDK, TypeScript). Dev tooling: Claude Code, Kiro Crew, Amazon Devices Builder Tools MCP.
