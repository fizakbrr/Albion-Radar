import { canonicalResourceName, collectStringParameters } from './HandlerUtils.js';

export const EnemyType =
{
    LivingHarvestable: 0,
    LivingSkinnable: 1,
    Enemy: 2,
    MediumEnemy: 3,
    EnchantedEnemy: 4,
    MiniBoss: 5,
    Boss: 6,
    Drone: 7,
    MistBoss: 8,
    Events: 9,
} as const;

export type EnemyTypeValue = typeof EnemyType[keyof typeof EnemyType];

class Mob
{
    [key: string]: any;

    constructor(id, typeId, posX, posY, health, enchantmentLevel, rarity)
    {
        this.id = id;
        this.typeId = typeId;
        this.posX = posX;
        this.posY = posY;
        this.health = health;
        this.enchantmentLevel = enchantmentLevel;
        this.rarity = rarity;
        this.tier = 0;
        this.type = EnemyType.Enemy;
        this.name = null;
        this.exp = 0;
        this.hX = 0;
        this.hY = 0;
    }
}

// MIST PORTALS ??
class Mist
{
    [key: string]: any;

    constructor(id, posX, posY, name, enchant)
    {
        this.id = id;
        this.posX = posX;
        this.posY = posY;
        this.name = name;
        this.enchant = enchant;
        this.hX = 0;
        this.hY = 0;

        if (name.toLowerCase().includes("solo"))
        {
            this.type = 0;
        }
        else
        {
            this.type = 1;
        }
    }
}

export class MobsHandler
{
    [key: string]: any;

    constructor(settings)
    {
        this.settings = settings;

        this.mobsList = [];
        this.mistList = [];
        this.mobinfo = {};

        this.harvestablesNotGood = [];
        this.recentLivingResources = [];

        const logEnemiesList = (globalThis as any).document?.getElementById?.("logEnemiesList");
        if (logEnemiesList)
            logEnemiesList.addEventListener("click", () => console.log(this.mobsList));
    }

    updateMobInfo(newData)
    {
        this.mobinfo = newData;
    }

    normalizeLivingResourceName(name)
    {
        return canonicalResourceName(name);
    }

    getLivingResourceSettings(name)
    {
        switch (this.normalizeLivingResourceName(name))
        {
            case "fiber":
                return this.settings.harvestingLivingFiber;
            case "hide":
                return this.settings.harvestingLivingHide;
            case "wood":
                return this.settings.harvestingLivingWood;
            case "ore":
                return this.settings.harvestingLivingOre;
            case "rock":
                return this.settings.harvestingLivingRock;
            default:
                return null;
        }
    }

    getStaticResourceSettings(name)
    {
        switch (this.normalizeLivingResourceName(name))
        {
            case "fiber":
                return this.settings.harvestingStaticFiber;
            case "hide":
                return this.settings.harvestingStaticHide;
            case "wood":
                return this.settings.harvestingStaticWood;
            case "ore":
                return this.settings.harvestingStaticOre;
            case "rock":
                return this.settings.harvestingStaticRock;
            default:
                return null;
        }
    }

    isLivingResource(mob)
    {
        return mob?.type == EnemyType.LivingSkinnable || mob?.type == EnemyType.LivingHarvestable;
    }

    normalizeEnchantmentLevel(enchantmentLevel)
    {
        const enchant = Number.isInteger(enchantmentLevel) ? enchantmentLevel : parseInt(enchantmentLevel, 10);

        return Number.isInteger(enchant) && enchant >= 0 && enchant <= 4 ? enchant : 0;
    }

    isResourceFilterEnabled(resourceSettings, tier, enchantmentLevel)
    {
        const enchantKey = `e${this.normalizeEnchantmentLevel(enchantmentLevel)}`;
        const parsedTier = Number.isInteger(tier) ? tier : parseInt(tier, 10);
        const tierIndex = parsedTier - 1;

        if (tierIndex < 0 || tierIndex >= 8)
            return false;

        return !!(resourceSettings && resourceSettings[enchantKey] && resourceSettings[enchantKey][tierIndex]);
    }

    isLivingResourceEnabled(type, name, tier, enchantmentLevel)
    {
        const resourceName = type == EnemyType.LivingSkinnable ? "hide" : name;
        const resourceSettings = type == EnemyType.LivingSkinnable
            ? this.settings.harvestingLivingHide
            : this.getLivingResourceSettings(resourceName);
        const staticResourceSettings = this.getStaticResourceSettings(resourceName);

        return this.isResourceFilterEnabled(resourceSettings, tier, enchantmentLevel)
            || this.isResourceFilterEnabled(staticResourceSettings, tier, enchantmentLevel);
    }

    isMistPortalName(name)
    {
        if (typeof name !== "string")
            return false;

        const normalizedName = name.toLowerCase();

        return normalizedName.includes("mist")
            && (normalizedName.includes("solo")
                || normalizedName.includes("duo")
                || normalizedName.includes("portal")
                || normalizedName.includes("entrance")
                || normalizedName.includes("exit"));
    }

    getStringParameter(parameters, indexes)
    {
        for (const index of indexes)
        {
            const value = parameters[index];

            if (typeof value === "string" && value.trim() !== "")
                return value;
        }

        return null;
    }

    getStringParameters(value)
    {
        return collectStringParameters(value);
    }

    getLivingResourceInfoFromName(name)
    {
        if (typeof name !== "string")
            return null;

        const tokens = name.toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean);
        const compactName = tokens.join("");
        const hasToken = (token) => tokens.includes(token);
        const tierToken = tokens.find((token) => /^T[1-8]$/.test(token));
        const tier = tierToken ? parseInt(tierToken.substring(1), 10) : undefined;

        if (hasToken("FIBER"))
            return { tier, type: EnemyType.LivingHarvestable, name: "fiber" };

        if (hasToken("ORE") || hasToken("METAL"))
            return { tier, type: EnemyType.LivingHarvestable, name: "ore" };

        if (hasToken("ROCK") || hasToken("STONE"))
            return { tier, type: EnemyType.LivingHarvestable, name: "rock" };

        if (hasToken("WOOD") || hasToken("LOG") || hasToken("LOGS") || hasToken("TREE"))
            return { tier, type: EnemyType.LivingHarvestable, name: "Logs" };

        const skinnableResourceTokens = [
            "ALLIGATOR",
            "BASILISK",
            "BEAR",
            "BIGHORN",
            "BISON",
            "BOAR",
            "COUGAR",
            "DEER",
            "DIREBEAR",
            "DIREBOAR",
            "DIREWOLF",
            "DOE",
            "DRAGON",
            "DRAGONHAWK",
            "HART",
            "FOX",
            "GIANTSNAKE",
            "GIANTSTAG",
            "HOUND",
            "HYENA",
            "IMPALA",
            "MAMMOTH",
            "MARABOU",
            "MARMOT",
            "MAULER",
            "MISTCOUGAR",
            "MISTHIDE",
            "MOABIRD",
            "MOOSE",
            "MONITORLIZARD",
            "OWL",
            "RABBIT",
            "RHINO",
            "SALAMANDER",
            "SABERTOOTH",
            "SABRETOOTH",
            "SNAKE",
            "STAG",
            "TERRORBIRD",
            "TIGER",
            "TOAD",
            "WHITE",
            "WOLF",
            "WOLFHOUND",
            "WOLPERTINGER",
        ];
        const skinnableResourceNames = [
            "ADULTCOUGAR",
            "ADULTSABERTOOTHTIGER",
            "ADULTSABRETOOTHTIGER",
            "ALPHAMISTCOUGAR",
            "ALPHASABERTOOTHTIGER",
            "ALPHASABRETOOTHTIGER",
            "ANCIENTALPHAMISTCOUGAR",
            "ANCIENTBASILISK",
            "ANCIENTGIANTBASILISK",
            "ANCIENTLARGEMISTCOUGAR",
            "ANCIENTMAMMOTH",
            "ANCIENTMISTCOUGAR",
            "ANCIENTSMALLMISTCOUGAR",
            "FEROCIOUSMISTHIDEMAULER",
            "FOGLANDSDOE",
            "FOGLANDSHART",
            "GRANDFOGLANDSHART",
            "GREATMYSTICOWL",
            "HILLMARMOT",
            "INSATIABLEWOLFHOUND",
            "LARGEMISTCOUGAR",
            "MAJESTICMYSTICOWL",
            "MATURESABERTOOTHTIGER",
            "MATURESABRETOOTHTIGER",
            "MISTCOUGARRUNT",
            "MISTHIDEMAULER",
            "OLDALPHAMISTCOUGAR",
            "OLDBASILISKASPECT",
            "OLDGIANTBASILISKASPECT",
            "OLDLARGEMISTCOUGAR",
            "OLDMISTCOUGAR",
            "OLDMISTCOUGARRUNT",
            "OLDSMALLMISTCOUGAR",
            "OLDWHITE",
            "OLDWHITESASPECT",
            "REGALDRAGONHAWK",
            "SABERTOOTHTIGER",
            "SABRETOOTHTIGER",
            "SMALLMISTCOUGAR",
            "SNOWRABBIT",
        ];

        if (hasToken("HIDE") || hasToken("SKIN") || hasToken("SKINNABLE") || hasToken("LEATHER"))
            return { tier, type: EnemyType.LivingSkinnable, name: "hide" };

        if (skinnableResourceTokens.some((token) => hasToken(token))
            || skinnableResourceNames.some((animalName) => compactName.includes(animalName)))
        {
            return { tier, type: EnemyType.LivingSkinnable, name: "hide" };
        }

        return null;
    }

    getLivingResourceInfoFromNames(names)
    {
        for (const name of names)
        {
            const info = this.getLivingResourceInfoFromName(name);

            if (info)
                return info;
        }

        return null;
    }

    applyLivingResourceInfo(mob, info)
    {
        if (!info)
            return false;

        if (Number.isInteger(info.tier))
            mob.tier = info.tier;

        mob.type = info.type;
        mob.name = info.name;

        return true;
    }

    addHiddenLivingResource(mob)
    {
        if (!this.harvestablesNotGood.some((x) => x.id === mob.id))
            this.harvestablesNotGood.push(mob);
    }

    getLivingResourceSnapshot(mob)
    {
        if (!this.isLivingResource(mob))
            return null;

        return {
            id: mob.id,
            typeId: mob.typeId,
            posX: mob.posX,
            posY: mob.posY,
            tier: mob.tier,
            type: mob.type,
            name: mob.name,
            enchantmentLevel: mob.enchantmentLevel,
            rememberedAt: Date.now(),
        };
    }

    rememberLivingResource(mob)
    {
        const snapshot = this.getLivingResourceSnapshot(mob);

        if (!snapshot)
            return;

        this.recentLivingResources = this.recentLivingResources.filter((entry) => entry.id !== snapshot.id);
        this.recentLivingResources.push(snapshot);

        const cutoff = Date.now() - 30000;
        this.recentLivingResources = this.recentLivingResources
            .filter((entry) => entry.rememberedAt >= cutoff)
            .slice(-80);
    }

    getLinkedLivingResource(id, posX = undefined, posY = undefined)
    {
        const active = [...this.mobsList, ...this.harvestablesNotGood];
        const byId = active.find((mob) => mob.id == id && this.isLivingResource(mob));

        if (byId)
            return this.getLivingResourceSnapshot(byId);

        const recentById = this.recentLivingResources.find((mob) => mob.id == id);

        if (recentById)
            return recentById;

        if (!Number.isFinite(posX) || !Number.isFinite(posY))
            return null;

        const maxDistance = 4;
        let nearest = null;
        let nearestDistance = Number.POSITIVE_INFINITY;
        const now = Date.now();

        for (const mob of this.recentLivingResources)
        {
            if (now - mob.rememberedAt > 30000)
                continue;

            const distance = Math.sqrt((mob.posX - posX) ** 2 + (mob.posY - posY) ** 2);

            if (distance <= maxDistance && distance < nearestDistance)
            {
                nearest = mob;
                nearestDistance = distance;
            }
        }

        return nearest;
    }

    getRecentLivingResources()
    {
        return this.recentLivingResources.map((entry) => ({ ...entry }));
    }

    refreshLivingResources()
    {
        const visibleMobs = [];

        for (const mob of this.mobsList)
        {
            if (this.isLivingResource(mob) && !this.isLivingResourceEnabled(mob.type, mob.name, mob.tier, mob.enchantmentLevel))
            {
                this.addHiddenLivingResource(mob);
                continue;
            }

            visibleMobs.push(mob);
        }

        this.mobsList = visibleMobs;

        const hiddenMobs = [];
        for (const mob of this.harvestablesNotGood)
        {
            if (this.isLivingResourceEnabled(mob.type, mob.name, mob.tier, mob.enchantmentLevel))
            {
                if (!this.mobsList.some((x) => x.id === mob.id))
                    this.mobsList.push(mob);
            }
            else
            {
                hiddenMobs.push(mob);
            }
        }

        this.harvestablesNotGood = hiddenMobs;
    }

    NewMobEvent(parameters)
    {
        const id = parseInt(parameters[0]); // entity id
        let typeId = parseInt(parameters[1]); // real type id

        const loc = parameters[7];
        if (!Array.isArray(loc) || loc.length < 2)
            return;

        let posX = loc[0];
        let posY = loc[1];

        const parsedExp = parseFloat(parameters[13]);
        const exp = Number.isFinite(parsedExp) ? parsedExp : 0;

        const stringParameters = this.getStringParameters(parameters);
        const name = this.getStringParameter(parameters, [32, 31]) || stringParameters[0];
        const mistName = stringParameters.find((value) => this.isMistPortalName(value));

        const enchant = parameters[33] ?? 0;

        const parsedRarity = parseInt(parameters[19]);
        const rarity = Number.isFinite(parsedRarity) ? parsedRarity : 1;

        if (this.mobinfo[typeId] == null && mistName)
        {
            this.AddMist(id, posX, posY, mistName, enchant);
        }
        else
        {
            this.AddEnemy(id, typeId, posX, posY, exp, enchant, rarity, parameters, stringParameters);
        }
    }
    

    AddEnemy(id, typeId, posX, posY, health, enchant, rarity, parameters, packetNames = [])
    {
        if (this.mobsList.some(mob => mob.id === id))
            return;

        if (this.harvestablesNotGood.some(mob => mob.id === id))
            return;

        const h = new Mob(id, typeId, posX, posY, health, enchant, rarity);
        const livingInfoFromPacketName = this.getLivingResourceInfoFromNames(packetNames);

        // Known enemy and living-resource ids from MobsInfo.
        if (this.mobinfo[typeId] != null) 
        {
            const mobsInfo = this.mobinfo[typeId];

            h.tier = mobsInfo[0];
            h.type = mobsInfo[1];
            h.name = mobsInfo[2];

            if (livingInfoFromPacketName)
                this.applyLivingResourceInfo(h, livingInfoFromPacketName);

            if (h.type == EnemyType.LivingSkinnable || h.type == EnemyType.LivingHarvestable)
            {
                /* 
                   If animal is enchanted, it'll probably never work and jump into this return
                   Because it's sending an event with normal animal with tier, ect
                   And after send another event to say, this animal is enchant Y
                   And it's the same with the other living harvestables
                   But keep that in case it changes
                */
                   //console.log(parameters);
                
                if (!this.isLivingResourceEnabled(h.type, h.name, h.tier, enchant))
                {
                    this.addHiddenLivingResource(h);
                    return;
                }
            }
            // Should do the work and handle all the enemies
            else if (h.type >= EnemyType.Enemy && h.type <= EnemyType.Boss)
            {
                const offset = EnemyType.Enemy;

                if (!this.settings.enemyLevels[h.type - offset])
                    return;

                if (this.settings.showMinimumHealthEnemies && health < this.settings.minimumHealthEnemies)
                    return;
            }
            else if (h.type == EnemyType.Drone)
            {
                if (!this.settings.avaloneDrones) return;
            }
            else if (h.type == EnemyType.MistBoss)
            {
                if (h.name == "CRYSTALSPIDER" && !this.settings.bossCrystalSpider) return;
                else if (h.name == "FAIRYDRAGON" && !this.settings.bossFairyDragon) return;
                else if (h.name == "VEILWEAVER" && !this.settings.bossVeilWeaver) return;
                else if (h.name == "GRIFFIN" && !this.settings.bossGriffin) return;
            }
            // Events
            else if (h.type == EnemyType.Events)
            {
                if (!this.settings.showEventEnemies) return;
            }
            // Unmanaged type
            else if (!this.settings.showUnmanagedEnemies) return;
            else
            {
                if (this.settings.showMinimumHealthEnemies && health < this.settings.minimumHealthEnemies)
                    return;
            }
            
        }
        // Unmanaged id
        else if (livingInfoFromPacketName)
        {
            this.applyLivingResourceInfo(h, livingInfoFromPacketName);

            if (!this.isLivingResourceEnabled(h.type, h.name, h.tier, enchant))
            {
                this.addHiddenLivingResource(h);
                return;
            }
        }
        else if (!this.settings.showUnmanagedEnemies) return;
        else
        {
            if (this.settings.showMinimumHealthEnemies && health < this.settings.minimumHealthEnemies)
                return;
        }

        this.mobsList.push(h);
    }

    removeMob(id)
    {
        const pSize = this.mobsList.length;
        const visibleMob = this.mobsList.find((x) => x.id == id);

        if (visibleMob)
            this.rememberLivingResource(visibleMob);

        this.mobsList = this.mobsList.filter((x) => x.id !== id);

        // That means we already removed the enemy, so it can't be in the other list
        if (this.mobsList.length < pSize) return;

        const hiddenMob = this.harvestablesNotGood.find((x) => x.id == id);

        if (hiddenMob)
            this.rememberLivingResource(hiddenMob);

        this.harvestablesNotGood = this.harvestablesNotGood.filter((x) => x.id !== id);
    }

    updateMobPosition(id, posX, posY)
    {
        var enemy = this.mobsList.find((enemy) => enemy.id === id);

        if (enemy)
        {
            enemy.posX = posX;
            enemy.posY = posY;

            return;
        }

        enemy = this.harvestablesNotGood.find((enemy) => enemy.id === id);

        if (!enemy) return;

        enemy.posX = posX;
        enemy.posY = posY;
    }

    updateEnchantEvent(parameters)
    {
        const mobId = parameters[0];
        const enchantmentLevel = this.normalizeEnchantmentLevel(parameters[1]);

        // Check in this list for the harvestables & skinnables with the id
        var enemy = this.mobsList.find((mob) => mob.id == mobId);

        if (enemy)
        {
            enemy.enchantmentLevel = enchantmentLevel;

            if (this.isLivingResource(enemy) && !this.isLivingResourceEnabled(enemy.type, enemy.name, enemy.tier, enemy.enchantmentLevel))
            {
                this.mobsList = this.mobsList.filter((x) => x.id !== enemy.id);
                this.addHiddenLivingResource(enemy);
            }

            return;
        }

        // Else try in our not good list
        enemy = this.harvestablesNotGood.find((mob) => mob.id == mobId);

        if (!enemy) return;

        enemy.enchantmentLevel = enchantmentLevel;

        if (!this.isLivingResourceEnabled(enemy.type, enemy.name, enemy.tier, enemy.enchantmentLevel))
            return;

        this.mobsList.push(enemy);
        this.harvestablesNotGood = this.harvestablesNotGood.filter((x) => x.id !== enemy.id);
    }

    getMobList()
    {
        return [...this.mobsList];
    }


    AddMist(id, posX, posY, name, enchant)
    {
        if (this.mistList.some((mist) => mist.id === id))
            return;

        const d = new Mist(id, posX, posY, name, enchant);

        this.mistList.push(d);
    }

    removeMist(id)
    {
        this.mistList = this.mistList.filter((mist) => mist.id !== id);
    }

    updateMistPosition(id, posX, posY)
    {
        var mist = this.mistList.find((mist) => mist.id === id);

        if (!mist) return;

        mist.posX = posX;
        mist.posY = posY;
    }

    updateMistEnchantmentLevel(id, enchantmentLevel)
    {
        var mist = this.mistList.find((mist) => mist.id === id);

        if (!mist) return;

        mist.enchant = enchantmentLevel;
    }

    Clear()
    {
        this.mobsList = [];
        this.mistList = [];
        this.harvestablesNotGood = [];
        this.recentLivingResources = [];
    }
}
