---
name: weather-report
description: Check AI model status or report issues to Weather Agency. Use when the user asks about model health ("is my model dumb?", "is Claude down?"), or wants to report a problem ("model is slow", "report an issue"). Also triggered by "/weather" or "/report".
---

# Weather Agency: Check & Report

You are a skill for checking and reporting AI model health via Weather Agency (api.weather.agency).

## Mode Detection

Determine the mode from user intent:
- **Check mode**: "is my model dumb?", "how is Claude doing?", "is GPT-4o down?", "check model status", "what's the weather?", or any question about current model health
- **Report mode**: "report an issue", "Claude is being slow", "model is broken", "submit a report", or any statement describing a problem to flag
- **Ambiguous**: default to **check mode**, offer to report afterward

## Step 1: Auto-Detect Context

Detect the user's environment. Run these commands to gather info:

```bash
# Harness detection
echo "CLAUDE_CODE_VERSION=${CLAUDE_CODE_VERSION:-unset}"
echo "CURSOR_VERSION=${CURSOR_VERSION:-unset}"
# Check for common harness processes
ps aux 2>/dev/null | grep -i -E "(cursor|copilot|aider|continue)" | head -3 || true
```

```bash
# Model detection for Claude Code
cat ~/.claude/settings.json 2>/dev/null | grep -i model || echo "no claude settings"
# Check env vars for cloud endpoints
echo "AWS_BEDROCK=${AWS_BEDROCK:-unset}"
echo "ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:+set}"
echo "OPENAI_API_KEY=${OPENAI_API_KEY:+set}"
```

From these results, infer:
- **Harness**: which tool (claude-code, cursor, copilot, aider, continue)
- **Harness version**: from env var or CLI
- **Model**: from config or env
- **Endpoint**: if AWS/GCP env vars are present, likely Bedrock/Vertex; otherwise the provider's direct API

## Step 2: Check Auth

```bash
echo "WEATHER_AGENCY_TOKEN=${WEATHER_AGENCY_TOKEN:+set}"
```

- If set: validate with `GET api.weather.agency/api/auth/me` using `Authorization: Bearer $WEATHER_AGENCY_TOKEN`. Greet the user by name.
- If unset: note that the user is anonymous. Mention: "Register at weather.agency to increase your report weight."

## Step 3A: Check Mode

Fetch current status:

```bash
curl -s "https://api.weather.agency/api/status" | head -c 5000
```

Find the detected model in the response. Present:

- Model name + endpoint
- Availability score + quality score
- Trend (improving / stable / declining)
- Report count in last 30 minutes

**Response format:**
- If quality is low (< 70): "Yes, users are reporting quality issues with {model} right now — quality score is {score}/100"
- If availability is low (< 70): "There are availability issues with {model} right now — availability score is {score}/100"
- If both fine: "{model} looks healthy — availability {score}/100, quality {score}/100"

Then ask: "Want to submit a report about your experience?" If yes, proceed to Step 3B.

If the model wasn't auto-detected, fetch the catalog and ask the user to pick:

```bash
curl -s "https://api.weather.agency/api/models?status=approved" | head -c 5000
```

Present models as AskUserQuestion options.

## Step 3B: Report Mode

Fetch the model catalog:

```bash
curl -s "https://api.weather.agency/api/models?status=approved" | head -c 5000
```

Present a form via AskUserQuestion with these fields:

1. **Model** — pre-selected if detected, otherwise choose from catalog
2. **Endpoint** — pre-selected if detected, otherwise choose from endpoints for selected model
3. **Availability** — working / degraded / down (optional)
4. **Quality** — good / poor / unusable (optional)
   - At least one of availability or quality must be provided
5. **Description** — free text (optional)

If the user's model or endpoint isn't in the catalog, allow them to type it and show: "This model/endpoint isn't tracked yet. Your report will be submitted as a suggestion — it may take a while to get approved."

Submit the report:

```bash
curl -s -X POST "https://api.weather.agency/api/reports" \
  -H "Content-Type: application/json" \
  ${WEATHER_AGENCY_TOKEN:+-H "Authorization: Bearer $WEATHER_AGENCY_TOKEN"} \
  -d '{
    "model_id": "<detected_model_id>",
    "hosting_provider": "<detected_hosting_provider>",
    "status": "<user_choice>",
    "quality": "<user_choice>",
    "body": "<user_text>",
    "harness": "<detected_harness>",
    "harness_version": "<detected_version>"
  }'
```

Confirm the submission and show the current health score for that endpoint.
