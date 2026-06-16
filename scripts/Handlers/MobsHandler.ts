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

        const logEnemiesList = document.getElementById("logEnemiesList");
        if (logEnemiesList)
            logEnemiesList.addEventListener("click", () => console.log(this.mobsList));
    }

    updateMobInfo(newData)
    {
        this.mobinfo = newData;
    }

    normalizeLivingResourceName(name)
    {
        if (typeof name !== "string")
            return "";

        switch (name.toLowerCase())
        {
            case "logs":
            case "log":
            case "wood":
                return "wood";
            case "fiber":
            case "hide":
            case "ore":
            case "rock":
                return name.toLowerCase();
            default:
                return "";
        }
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

    isLivingResourceEnabled(type, name, tier, enchantmentLevel)
    {
        const enchant = Number.isInteger(enchantmentLevel) ? enchantmentLevel : parseInt(enchantmentLevel, 10);
        const enchantKey = `e${Number.isInteger(enchant) && enchant >= 0 && enchant <= 4 ? enchant : 0}`;
        const tierIndex = tier - 1;

        if (tierIndex < 0 || tierIndex >= 8)
            return false;

        const resourceSettings = type == EnemyType.LivingSkinnable
            ? this.settings.harvestingLivingHide
            : this.getLivingResourceSettings(name);

        return !!(resourceSettings && resourceSettings[enchantKey] && resourceSettings[enchantKey][tierIndex]);
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

        let exp = 0
        try
        {
            exp = parseFloat(parameters[13]);
        }
        catch (error)
        {
            exp = 0;
        }

        let name = null;
        try
        {
            name = parameters[32];
        }
        catch (error)
        {
            try
            {
                name = parameters[31];
            }
            catch (error2)
            {
                name = null;
            }
        }

        let enchant = 0;
        try
        {
            enchant = parameters[33];
        }
        catch (error)
        {
            enchant = 0;
        }

        let rarity = 1;
        try
        {
            rarity = parseInt(parameters[19]);
        }
        catch (error)
        {
            rarity = 1;
        }

        if (name != null)
        {
            this.AddMist(id, posX, posY, name, enchant);
        }
        else
        {
            this.AddEnemy(id, typeId, posX, posY, exp, enchant, rarity, parameters);
        }
    }
    

    AddEnemy(id, typeId, posX, posY, health, enchant, rarity, parameters)
    {
        if (this.mobsList.some(mob => mob.id === id))
            return;

        if (this.harvestablesNotGood.some(mob => mob.id === id))
            return;

        const h = new Mob(id, typeId, posX, posY, health, enchant, rarity);

        // Known enemy and living-resource ids from MobsInfo.
        if (this.mobinfo[typeId] != null) 
        {
            const mobsInfo = this.mobinfo[typeId];

            h.tier = mobsInfo[0];
            h.type = mobsInfo[1];
            h.name = mobsInfo[2];

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
                    this.harvestablesNotGood.push(h);
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
                else if (h.name == "FAIRYDRAGON" && !this.settings.settingBossFairyDragon) return;
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

        this.mobsList = this.mobsList.filter((x) => x.id !== id);

        // That means we already removed the enemy, so it can't be in the other list
        if (this.mobsList.length < pSize) return;

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

        // We don't need to update mobs we don't show yet
        /*enemy = this.harvestablesNotGood.find((enemy) => enemy.id === id);

        if (!enemy) return;

        enemy.posX = posX;
        enemy.posY = posY;*/
    }

    updateEnchantEvent(parameters)
    {
        const mobId = parameters[0];
        const enchantmentLevel = parameters[1];

        // Check in this list for the harvestables & skinnables with the id
        var enemy = this.mobsList.find((mob) => mob.id == mobId);

        if (enemy)
        {
            enemy.enchantmentLevel = enchantmentLevel;
            return;
        }

        // Else try in our not good list
        enemy = this.harvestablesNotGood.find((mob) => mob.id == mobId);

        if (!enemy) return;

        enemy.enchantmentLevel = enchantmentLevel;

        if (!this.isLivingResourceEnabled(enemy.type, enemy.name, enemy.tier, enemy.enchantmentLevel))
        {
            return;
        }

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
    }
}
