# Switch to work AWS Bedrock account
function claude-work
    set -e ANTHROPIC_BASE_URL
    set -e ANTHROPIC_AUTH_TOKEN
    set -gx CLAUDE_CODE_USE_BEDROCK 1
    set -gx AWS_PROFILE PedroAWS # Replace with your actual profile name
    set -gx AWS_REGION us-east-2
    # echo "✓ Switched to AWS Bedrock work account"
end

function claude-work-proxy
    set -e CLAUDE_CODE_USE_BEDROCK
    set -e AWS_PROFILE
    set -e AWS_REGION
    set -gx ANTHROPIC_BASE_URL https://pedro.microchip.com/api
    set -gx ANTHROPIC_AUTH_TOKEN $PEDRO_API_KEY
    # echo "✓ Switched to Pedro Work proxy"
end

# Switch to personal Claude account
function claude-personal
    set -e ANTHROPIC_BASE_URL
    set -e ANTHROPIC_AUTH_TOKEN
    set -e CLAUDE_CODE_USE_BEDROCK
    set -e AWS_PROFILE
    set -e AWS_REGION
    echo "✓ Switched to personal Claude account"
end

# Check which account is currently active
function claude-status
    if set -q CLAUDE_CODE_USE_BEDROCK
        echo "Currently using: AWS Bedrock"
        echo "AWS Profile: $AWS_PROFILE"
        echo "Region: $AWS_REGION"
    else if set -q ANTHROPIC_BASE_URL
        echo "Currently using: Pedro Work proxy"
    else
        echo "Currently using: Personal Claude account"
    end
end

claude-work-proxy
