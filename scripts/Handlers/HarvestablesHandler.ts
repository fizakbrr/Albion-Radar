import { canonicalResourceName, collectStringParameters } from './HandlerUtils.js';

export const HarvestableType =
{
    Fiber: 'Fiber',
    Hide: 'Hide',
    Log: 'Log',
    Ore: 'Ore',
    Rock: 'Rock'
};

class Harvestable
{
    [key: string]: any;

    constructor(id, type, tier, posX, posY, charges, size, resourceType)
    {
        this.id = id;
        this.type = type;
        this.resourceType = resourceType;
        this.tier = tier;
        this.posX = posX;
        this.posY = posY;
        this.hX = 0;
        this.hY = 0;

        this.charges = charges;
        this.size = size;
    }

    setCharges(charges)
    {
        this.charges = charges;
    }
}

function toArray(value)
{
    if (Array.isArray(value))
        return value;

    if (value && Array.isArray(value.data))
        return value.data;

    return [];
}

export class HarvestablesHandler
{
    [key: string]: any;

    constructor(settings)
    {
        this.harvestableList = [];
        this.settings = settings;
        this.livingResourceSource = null;
    }

    setLivingResourceSource(livingResourceSource)
    {
        this.livingResourceSource = livingResourceSource;
    }

    normalizeResourceType(resourceType)
    {
        const canonicalToHarvestable = {
            fiber: HarvestableType.Fiber,
            hide: HarvestableType.Hide,
            wood: HarvestableType.Log,
            ore: HarvestableType.Ore,
            rock: HarvestableType.Rock,
        };

        return canonicalToHarvestable[canonicalResourceName(resourceType)] || "";
    }

    getStringParameters(value)
    {
        return collectStringParameters(value);
    }

    getResourceTypeFromName(name)
    {
        if (typeof name !== "string")
            return "";

        const tokens = name.toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean);
        const hasToken = (token) => tokens.includes(token);

        if (hasToken("HIDE") || hasToken("SKIN") || hasToken("SKINNABLE") || hasToken("LEATHER"))
            return HarvestableType.Hide;

        if (hasToken("ORE") || hasToken("METAL"))
            return HarvestableType.Ore;

        if (hasToken("ROCK") || hasToken("STONE"))
            return HarvestableType.Rock;

        if (hasToken("FIBER"))
            return HarvestableType.Fiber;

        if (hasToken("WOOD") || hasToken("LOG") || hasToken("LOGS") || hasToken("TREE"))
            return HarvestableType.Log;

        return "";
    }

    getResourceTypeFromParameters(parameters)
    {
        for (const name of this.getStringParameters(parameters))
        {
            const resourceType = this.getResourceTypeFromName(name);

            if (resourceType)
                return resourceType;
        }

        return "";
    }

    getResourceTypeFromLivingResource(livingResource)
    {
        if (!livingResource)
            return "";

        if (livingResource.type == 1)
            return HarvestableType.Hide;

        return this.normalizeResourceType(livingResource.name);
    }

    getLinkedLivingResource(id, posX, posY)
    {
        if (!this.livingResourceSource || typeof this.livingResourceSource.getLinkedLivingResource !== "function")
            return null;

        return this.livingResourceSource.getLinkedLivingResource(id, posX, posY);
    }

    resolveResourceType(typeNumber, resourceOverride = "")
    {
        return this.normalizeResourceType(resourceOverride) || this.GetStringType(typeNumber);
    }

    getStaticResourceSettings(resourceType)
    {
        switch (resourceType)
        {
            case HarvestableType.Fiber:
                return this.settings.harvestingStaticFiber;
            case HarvestableType.Hide:
                return this.settings.harvestingStaticHide;
            case HarvestableType.Log:
                return this.settings.harvestingStaticWood;
            case HarvestableType.Ore:
                return this.settings.harvestingStaticOre;
            case HarvestableType.Rock:
                return this.settings.harvestingStaticRock;
            default:
                return null;
        }
    }

    isStaticResourceEnabled(resourceType, tier, charges)
    {
        const parsedTier = Number.isInteger(tier) ? tier : parseInt(tier, 10);
        const parsedCharges = Number.isInteger(charges) ? charges : parseInt(charges, 10);
        const enchant = Number.isInteger(parsedCharges) && parsedCharges >= 0 && parsedCharges <= 4 ? parsedCharges : 0;
        const tierIndex = parsedTier - 1;
        const resourceSettings = this.getStaticResourceSettings(resourceType);

        return !!(resourceSettings && tierIndex >= 0 && tierIndex < 8 && resourceSettings[`e${enchant}`]?.[tierIndex]);
    }

    addHarvestable(id, type, tier, posX, posY, charges, size, resourceOverride = "")
    {
        const resourceType = this.resolveResourceType(type, resourceOverride);

        if (!this.isStaticResourceEnabled(resourceType, tier, charges))
            return;

        
        var harvestable = this.harvestableList.find((item) => item.id === id);

        if (!harvestable)
        {
            const h = new Harvestable(id, type, tier, posX, posY, charges, size, resourceType);
            this.harvestableList.push(h);
            //console.log("New Harvestable: " + h.toString());
        } 
        else // update
        {
            harvestable.resourceType = resourceType;
            harvestable.setCharges(charges);
        }
    }

    UpdateHarvestable(id, type, tier, posX, posY, charges, size, resourceOverride = "")
    {
        const resourceType = this.resolveResourceType(type, resourceOverride);

        if (!this.isStaticResourceEnabled(resourceType, tier, charges))
            return;

        var harvestable = this.harvestableList.find((item) => item.id === id);

        if (!harvestable)
        {
            this.addHarvestable(id, type, tier, posX, posY, charges, size, resourceType);
            return;
        }

        harvestable.resourceType = resourceType;
        harvestable.charges = charges;
        harvestable.size = size;
    }

    harvestFinished(Parameters)
    {

        const id = Parameters[3];
        const count = Parameters[5];

        this.updateHarvestable(id, count);
    }

    HarvestUpdateEvent(Parameters)
    {
        const id = Parameters[0];

        if (Parameters[1] === undefined)
        {
            this.removeHarvestable(id);
            return;
        }
        
        var harvestable = this.harvestableList.find((item) => item.id === id);

        if (!harvestable) return;

        harvestable.size = Parameters[1];
    }

    // Normally work with everything
    // Good
    newHarvestableObject(id, Parameters) // Update
    {
        const type = Parameters[5];
        const tier = Parameters[7];
        const location = Parameters[8];

        let enchant = Parameters[11] === undefined ? 0 : Parameters[11];
        let size = Parameters[10] === undefined ? 0 : Parameters[10];

        if (!Array.isArray(location) || location.length < 2)
            return;

        const linkedLivingResource = this.getLinkedLivingResource(id, location[0], location[1]);
        const resourceOverride = this.getResourceTypeFromParameters(Parameters)
            || this.getResourceTypeFromLivingResource(linkedLivingResource);

        this.UpdateHarvestable(id, type, tier, location[0], location[1], enchant, size, resourceOverride);
    }

    base64ToArrayBuffer(base64)
    {
        var binaryString = atob(base64);
        var bytes = new Uint8Array(binaryString.length);

        for (var i = 0; i < binaryString.length; i++)
        {
            bytes[i] = binaryString.charCodeAt(i);
        }
        
        return bytes;
    }

    // Normally work with everything 
    // Good
    newSimpleHarvestableObject(Parameters) // New
    {
        const a0 = toArray(Parameters[0]);

        if (a0.length === 0) return;

        const a1 = toArray(Parameters[1]);
        const a2 = toArray(Parameters[2]);
 
        const a3 = toArray(Parameters[3]);
        const a4 = toArray(Parameters[4]);

        for (let i = 0; i < a0.length; i++) {
            const id = a0[i];
            const type = a1[i];
            const tier = a2[i];
            const posX = a3[i * 2];
            const posY = a3[i * 2 + 1];
            const count = a4[i];

            const resourceOverride = this.getResourceTypeFromParameters([id, type, tier, posX, posY]);
            this.addHarvestable(id, type, tier, posX, posY, 0, count, resourceOverride);
        }
    }

    removeNotInRange(lpX, lpY)
    {
        const range = Number.isFinite(this.settings?.harvestableRange) ? this.settings.harvestableRange : 80;
        this.harvestableList = this.harvestableList.filter(
            (x) => this.calculateDistance(lpX, lpY, x.posX, x.posY) <= range
        );

        this.harvestableList = this.harvestableList.filter(item => item.size !== undefined);
    }

    calculateDistance(lpX, lpY, posX, posY)
    {
        const deltaX = lpX - posX;
        const deltaY = lpY - posY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        return distance;
    }

    removeHarvestable(id)
    {
        this.harvestableList = this.harvestableList.filter((x) => x.id !== id);
    }

    getHarvestableList() {
        return [...this.harvestableList];
    }

    updateHarvestable(harvestableId, count)
    {   
        const harvestable = this.harvestableList.find((h) => h.id == harvestableId);

        if (harvestable)
        {
            harvestable.size = harvestable.size - count;
        }
    }

    GetStringType(typeNumber)
    {
        if (typeNumber >= 0 && typeNumber <= 5)
        {
            return HarvestableType.Log;
        }
        else if (typeNumber >= 6 && typeNumber <= 10)
        {
            return HarvestableType.Rock;
        }
        else if (typeNumber >= 11 && typeNumber <= 14)
        {
            return HarvestableType.Fiber;
        }
        else if (typeNumber >= 15 && typeNumber <= 22)
        {
            return HarvestableType.Hide;
        }
        else if (typeNumber >= 23 && typeNumber <= 27)
        {
            return HarvestableType.Ore;
        }
        else return '';
    }

    Clear()
    {
        this.harvestableList = [];
    }
}
