export class PlayersDrawing extends DrawingUtils
{
    constructor(Settings)
    {
        super(Settings);

        this.itemsInfo = {};
    }

    updateItemsInfo(newData)
    {
        this.itemsInfo = newData;
    }

    ensureItemsCanvasHeight(canvas, rowCount)
    {
        const rowHeight = 70;
        const requiredHeight = Math.max(500, 35 + (rowCount * rowHeight));

        if (canvas.height !== requiredHeight)
            canvas.height = requiredHeight;

        if (canvas.style.height !== requiredHeight + "px")
            canvas.style.height = requiredHeight + "px";
    }

    drawItems(context, canvas, players, devMode)
    {
        if (!this.settings.settingDot)
            return;

        const playersWithItems = players.filter(player => player.items != null);
        this.ensureItemsCanvasHeight(canvas, playersWithItems.length);

        let posY = 15;

        if (playersWithItems.length <= 0)
        {
            this.settings.ClearPreloadedImages("Items");
            return;
        }

        for (const playerOne of playersWithItems)
        {
            const items = playerOne.items;

            let posX = 5;

            const flagId = playerOne.flagId || 0;
            const flagName = FactionFlagInfo[flagId] || FactionFlagInfo[0];
            this.DrawCustomImage(context, posX + 10, posY - 5, flagName, 'Flags', 20);
            let posTemp = posX + 25;

            const nickname = String(playerOne.nickname || "Unknown");
            this.drawTextItems(posTemp, posY, nickname, context, "14px", "white");

            posTemp += context.measureText(nickname).width + 10;
            this.drawTextItems(posTemp, posY, playerOne.currentHealth + "/" + playerOne.initialHealth, context, "14px", "red");

            posTemp += context.measureText(playerOne.currentHealth + "/" + playerOne.initialHealth).width + 10;

            let itemsListString = "";

            posX += 20;
            posY += 25;

            if (items["type"] === "Buffer") // No items
            {
                posX = 0;
                posY += 50;
                continue;
            }

            for (const item of items)
            {
                const itemInfo = this.itemsInfo[item];

                if (itemInfo != undefined && this.settings.GetPreloadedImage(itemInfo, "Items") !== null)
                {
                    this.DrawCustomImage(context, posX, posY, itemInfo, "Items", 40);
                }

                posX += 10 + 40;
                itemsListString += item.toString() + " ";
            }

            if (devMode)
            {
                this.drawTextItems(posTemp, posY - 5, itemsListString, context, "14px", "white");
            }

            posY += 45;
        }
    }

    interpolate(players, lpX, lpY, t)
    {
        for (const playerOne of players)
        {
            if (!Number.isFinite(playerOne.posX) || !Number.isFinite(playerOne.posY))
                continue;

            const hX = -1 * playerOne.posX + lpX;
            const hY = playerOne.posY - lpY;
            playerOne.distance = Math.round(Math.sqrt(
                ((playerOne.posX - lpX) * (playerOne.posX - lpX)) +
                ((playerOne.posY - lpY) * (playerOne.posY - lpY))
            ));

            if (playerOne.hY == 0 && playerOne.hX == 0)
            {
                playerOne.hX = hX;
                playerOne.hY = hY;
            }

            playerOne.hX = this.lerp(playerOne.hX, hX, t);
            playerOne.hY = this.lerp(playerOne.hY, hY, t);
        }
    }

    invalidate(context, players)
    {
        if (!this.settings.settingDot)
            return;

        const playersWithoutPosition = [];

        for (const playerOne of players)
        {
            if (!Number.isFinite(playerOne.posX) || !Number.isFinite(playerOne.posY))
            {
                playersWithoutPosition.push(playerOne);
                continue;
            }

            const point = this.transformPoint(playerOne.hX, playerOne.hY);
            let space = 0;

            const flagId = playerOne.flagId || 0;
            const flagName = FactionFlagInfo[flagId] || FactionFlagInfo[0];

            if (this.settings.settingMounted)
            {
                context.beginPath();
                context.arc(point.x, point.y, 11, 0, 2 * Math.PI, false);
                context.strokeStyle = playerOne.mounted ? 'green' : 'red';
                context.lineWidth = 3;
                context.stroke();
            }

            this.DrawCustomImage(context, point.x, point.y, flagName, "Flags", 20);

            if (this.settings.settingNickname == true)
            {
                space += 23;
                this.drawText(point.x, point.y + space, playerOne.nickname, context);
            }

            if (this.settings.settingDistance)
            {
                this.drawText(point.x, point.y - 14, playerOne.distance + "m", context);
            }

            if (this.settings.settingHealth && Number.isFinite(playerOne.currentHealth) && Number.isFinite(playerOne.initialHealth) && playerOne.initialHealth > 0)
            {
                space += 6;

                const percent = playerOne.currentHealth / playerOne.initialHealth;
                let width = 60;
                let height = 7;

                context.fillStyle = "#121317";
                context.fillRect(
                    point.x - width / 2,
                    point.y - height / 2 + space,
                    width,
                    height
                );

                context.fillStyle = "red";
                context.fillRect(
                    point.x - width / 2,
                    point.y - height / 2 + space,
                    width * percent,
                    height
                );
            }

            if (this.settings.settingGuild)
            {
                space += 14;

                if (playerOne.guildName != "undefined")
                    this.drawText(point.x, point.y + space, playerOne.guildName, context);
            }
        }

        this.drawPositionlessPlayers(context, playersWithoutPosition);
    }

    drawPositionlessPlayers(context, players)
    {
        if (players.length === 0)
            return;

        const maxPlayers = Math.min(players.length, 8);
        const width = 185;
        const height = 24 + (maxPlayers * 16);

        context.save();
        context.fillStyle = "rgba(0, 0, 0, 0.55)";
        context.fillRect(8, 8, width, height);

        context.font = "12px Arial";
        context.fillStyle = "#ffffff";
        context.fillText("Detected players", 16, 24);

        for (let i = 0; i < maxPlayers; i++)
        {
            const player = players[i];
            const name = String(player.nickname || "Unknown").slice(0, 22);
            const health = Number.isFinite(player.currentHealth) ? ` ${player.currentHealth}` : "";
            context.fillText(`${name}${health}`, 16, 42 + (i * 16));
        }

        if (players.length > maxPlayers)
            context.fillText(`+${players.length - maxPlayers} more`, 16, 42 + (maxPlayers * 16));

        context.restore();
    }
}
