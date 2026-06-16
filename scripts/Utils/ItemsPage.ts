import { ItemsInfo } from '../Handlers/ItemsInfo.js';
import { Settings } from './Settings.js';
import { getRadarWebSocketUrl } from './WebSocketConfig.js';

function getCanvasElement(id)
{
    const element = document.getElementById(id);

    if (!(element instanceof HTMLCanvasElement))
        throw new Error(`Missing canvas #${id}`);

    return element;
}

var canvasItems = getCanvasElement("thirdCanvas");
var contextItems = canvasItems.getContext("2d");

const settings = new Settings();

function updateItemsStatus(message, state = 'idle') {
    const status = document.getElementById('itemsStatus');
    if (!status) return;

    status.textContent = message;
    status.dataset.state = state;
}

function showItemsError(message, error) {
    const errorBox = document.getElementById('itemsError');
    if (errorBox) {
        errorBox.hidden = false;
        errorBox.textContent = message;
    }

    if (error) {
        console.error(`[camel] ${message}`, error);
    } else {
        console.error(`[camel] ${message}`);
    }
}

var itemsInfo = new ItemsInfo();
itemsInfo.initItems().then(() => {
    var players = [];

    const socket = new WebSocket(getRadarWebSocketUrl());
        
    socket.addEventListener('open', (event) => {
        updateItemsStatus('Connected to local WebSocket stream', 'connected');
    });

    socket.addEventListener('close', () => {
        updateItemsStatus('WebSocket stream closed', 'closed');
    });

    socket.addEventListener('error', (event) => {
        updateItemsStatus('WebSocket connection failed', 'error');
        showItemsError('Could not connect to the Camel Radar WebSocket server.', event);
    });

    socket.addEventListener('message', (event) => {
    let data;
    let extractedDictionary;

    try {
        data = JSON.parse(event.data);
        extractedDictionary = JSON.parse(data.dictionary);
    } catch (error) {
        showItemsError('Received an unreadable WebSocket message.', error);
        return;
    }

    // Extract the string and dictionary from the object
    var extractedString = data.code;

    var parameters = extractedDictionary["parameters"];
    if (!parameters) return;

    updateItemsStatus('Receiving player equipment stream', 'connected');

    switch (extractedString)
    {
        case "items":
            switch (parameters[252]) {
                case 1: // Leave
                    RemovePlayer(parameters);
                    break;

                case 28: // NewCharacter
                    AddPlayer(parameters);
                    break;

                case 88: // CharacterEquipmentChanged
                    UpdateItems(parameters);
                    break;
            
                default:
                    break;
            }
            break;
    }
    });


    function AddPlayer(parameters)
    {
        if (!settings.settingDot)
            return;

        /* General */
        const id = parameters[0];
        const nickname = parameters[1];

        /* Health */
        const currentHealth = parameters[20];
        const initialHealth = parameters[21];

        /* Items & flag */
        const items = parameters[38];
        const flagId = parameters[51];

        players.push(new Player(id, items, currentHealth, initialHealth, nickname));
    }

    function RemovePlayer(parameters)
    {
        players = players.filter(player => player.id != parameters[0]);
    }

    function UpdateItems(parameters)
    {
        let items = undefined;

        try
        {
            items = parameters[2];
        }
        catch { }

        if (items == undefined) return;

        var nPlayer = players.find((player) => player.id === parameters[0]);

        if (nPlayer == undefined || nPlayer == null) return;

        nPlayer.items = items;
    }



    function ensureItemsCanvasHeight(rowCount)
    {
        const rowHeight = 70;
        const requiredHeight = Math.max(500, 35 + (rowCount * rowHeight));

        if (canvasItems.height !== requiredHeight)
            canvasItems.height = requiredHeight;

        if (canvasItems.style.height !== requiredHeight + "px")
            canvasItems.style.height = requiredHeight + "px";
    }

    function DrawItems()
    {
        const playersWithItems = players.filter(player => player.items != null && player.items != undefined);
        ensureItemsCanvasHeight(playersWithItems.length);
        contextItems.clearRect(0, 0, canvasItems.width, canvasItems.height);

        if (!settings.settingItems) return;

        let posY = 15;

        if (playersWithItems.length <= 0)
        {
            settings.ClearPreloadedImages("Items");
            return;
        }

        for (const playerOne of playersWithItems)
        {
            const items = playerOne.items;

            let posX = 5;

            /*const flagId = playerOne.flagId || 0
            const flagName = FactionFlagInfo[flagId]
            DrawCustomImage(context, posX + 10, posY - 5, flagName, 'Flags', 20)
            let posTemp = posX + 25*/

            let posTemp = posX;

            const nickname = String(playerOne.name || "Unknown");
            drawTextItems(posTemp, posY, nickname, contextItems, "14px", "white");

            posTemp += contextItems.measureText(nickname).width + 10;
            drawTextItems(posTemp, posY, playerOne.cHealth + "/" + playerOne.mHealth, contextItems, "14px", "red");

            posTemp += contextItems.measureText(playerOne.cHealth + "/" + playerOne.mHealth).width + 10;

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
                const itemInfo = itemsInfo.get(item);

                if (itemInfo != undefined && settings.GetPreloadedImage(itemInfo, "Items") !== null)
                {
                    DrawCustomImage(contextItems, posX, posY, itemInfo, "Items", 40);
                }

                posX += 10 + 40;
                itemsListString += item.toString() + " ";
            }

            if (settings.settingItemsDev)
            {
                drawTextItems(posTemp, posY - 5, itemsListString, contextItems, "14px", "white");
            }
        
            posY += 45;
        }    
    }

    function drawTextItems(xTemp, yTemp, text, ctx , size , color)
    {
        ctx.font = size + " " + "Arial";
        ctx.fillStyle = color;

        let x = xTemp;
        let y = yTemp;

        ctx.fillText(text, x , y);
    }

    function DrawCustomImage(ctx, x, y, imageName, folder, size)
    {
        if (imageName == "" || imageName === undefined)
            return;
        
        const folderR = folder == "" || folder === undefined ? "" : folder + "/";

        const src = "/images/" + folderR + imageName + ".png"; 

        const preloadedImage = settings.GetPreloadedImage(src, folder);

        if (preloadedImage === null) 
        {
            drawFilledCircle(ctx, x, y, 10, "#4169E1");
            return;
        }

        if (preloadedImage)
        {
            ctx.drawImage(preloadedImage, x - size / 2, y - size / 2, size, size);
        }
        else
        {
            settings.preloadImageAndAddToList(src, folder)
            .then(() => console.log('Item loaded'))
            .catch(() => console.log('Item not loaded'));
        }
    }

    function drawFilledCircle(context, x, y, radius, color)
    {
        context.beginPath();
        context.arc(x , y , radius, 0, 2 * Math.PI);
        context.fillStyle = color;
        context.fill();
    }


    const intervalItems = 300;
    setInterval(DrawItems, intervalItems);

    function checkLocalStorage()
    {
        settings.update();
    }

    const interval = 5000;
    setInterval(checkLocalStorage, interval)
});

class Player
{
    [key: string]: any;

    constructor(id, items, cHealth, mHealth, name)
    {
        this.id = id;
        this.items = items;
        this.cHealth = cHealth;
        this.mHealth = mHealth;
        this.name = name;
    }
}
