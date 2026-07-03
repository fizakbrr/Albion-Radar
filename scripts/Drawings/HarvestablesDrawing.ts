import { DrawingUtils } from '../Utils/DrawingUtils.js';
import { HarvestableType } from '../Handlers/HarvestablesHandler.js';

export class HarvestablesDrawing extends DrawingUtils  {


    constructor(Settings) {

        super(Settings);
    
    }
    
    interpolate(harvestables, lpX, lpY ,t ) {

        for (const harvestableOne of harvestables) {
 
            const hX = -1 * harvestableOne.posX + lpX;
            const hY = harvestableOne.posY - lpY;

       
            if (harvestableOne.hY == 0 && harvestableOne.hX == 0) {
                harvestableOne.hX = hX;
                harvestableOne.hY = hY;

            }
            
            harvestableOne.hX = this.lerp(harvestableOne.hX, hX, t);
            harvestableOne.hY = this.lerp(harvestableOne.hY, hY, t);
            
        }

    }

    getResourceImagePrefix(harvestable)
    {
        switch (harvestable.resourceType)
        {
            case HarvestableType.Fiber:
                return "fiber";
            case HarvestableType.Hide:
                return "hide";
            case HarvestableType.Log:
                return "Logs";
            case HarvestableType.Ore:
                return "ore";
            case HarvestableType.Rock:
                return "rock";
            default:
                break;
        }

        const type = harvestable.type;

        if (type >= 0 && type <= 5)
            return "Logs";

        if (type >= 6 && type <= 10)
            return "rock";

        if (type >= 11 && type <= 14)
            return "fiber";

        if (type >= 15 && type <= 22)
            return "hide";

        if (type >= 23 && type <= 27)
            return "ore";

        return "";
    }

    getHarvestableImageName(harvestable)
    {
        const resourcePrefix = this.getResourceImagePrefix(harvestable);

        if (!resourcePrefix)
            return undefined;

        return resourcePrefix + "_" + harvestable.tier + "_" + harvestable.charges;
    }

    invalidate(ctx, harvestables)
    {
        for (const harvestableOne of harvestables)
        {
            if (harvestableOne.size <= 0) continue;

            const type = harvestableOne.type;
            const draw = this.getHarvestableImageName(harvestableOne);

            if (draw === undefined)
                continue;


            const point = this.transformPoint(harvestableOne.hX, harvestableOne.hY);
            this.DrawCustomImage(ctx, point.x, point.y, draw, "Resources", 50);

            if (this.settings.livingResourcesID)
                this.drawText(point.x, point.y + 20, type.toString(), ctx);

            let tier = "I";
            switch (harvestableOne.tier)
            {
                case 1: tier = "I"; break;
                case 2: tier = "II"; break;
                case 3: tier = "III"; break;
                case 4: tier = "IV"; break;
                case 5: tier = "V"; break;
                case 6: tier = "VI"; break;
                case 7: tier = "VII"; break;
                case 8: tier = "VIII"; break;

                default:
                    tier = "";
                    break;
            }

            this.drawText(point.x - 10, point.y - 10, tier.toString(), ctx, 9, "monospace", "#585858", 10);

            if (this.settings.resourceSize)
            {
                harvestableOne.size = parseInt(harvestableOne.size);
                this.drawText(point.x + 13, point.y + 15, harvestableOne.size, ctx, 8);
            }
            
        }
    }  
}
