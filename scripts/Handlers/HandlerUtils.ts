// Shared helpers for MobsHandler and HarvestablesHandler.

export function collectStringParameters(value)
{
    const strings = [];
    const visit = (candidate) =>
    {
        if (typeof candidate === "string")
        {
            const trimmed = candidate.trim();

            if (trimmed !== "")
                strings.push(trimmed);

            return;
        }

        if (Array.isArray(candidate))
        {
            for (const item of candidate)
                visit(item);

            return;
        }

        if (candidate && typeof candidate === "object" && candidate.type !== "Buffer")
        {
            for (const item of Object.values(candidate))
                visit(item);
        }
    };

    visit(value);

    return strings;
}

const RESOURCE_ALIASES = {
    logs: "wood",
    log: "wood",
    wood: "wood",
    fiber: "fiber",
    hide: "hide",
    skin: "hide",
    leather: "hide",
    ore: "ore",
    metal: "ore",
    rock: "rock",
    stone: "rock",
};

// Returns "fiber" | "hide" | "wood" | "ore" | "rock" | "".
export function canonicalResourceName(name)
{
    if (typeof name !== "string")
        return "";

    return RESOURCE_ALIASES[name.trim().toLowerCase()] || "";
}
