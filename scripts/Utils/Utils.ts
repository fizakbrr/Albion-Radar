import { PlayersDrawing } from '../Drawings/PlayersDrawing.js';
import { HarvestablesDrawing } from '../Drawings/HarvestablesDrawing.js';
import { MobsDrawing } from '../Drawings/MobsDrawing.js';
import { ChestsDrawing } from '../Drawings/ChestsDrawing.js';
import { DungeonsDrawing } from '../Drawings/DungeonsDrawing.js';
import { MapDrawing } from '../Drawings/MapsDrawing.js';
import { WispCageDrawing } from '../Drawings/WispCageDrawing.js';
import { FishingDrawing } from '../Drawings/FishingDrawing.js';

import { EventCodes } from './EventCodes.js';

import { PlayersHandler } from '../Handlers/PlayersHandler.js';
import { ChestsHandler } from '../Handlers/ChestsHandler.js';
import { DungeonsHandler } from '../Handlers/DungeonsHandler.js';
import { HarvestablesHandler } from '../Handlers/HarvestablesHandler.js';
import { ItemsInfo } from '../Handlers/ItemsInfo.js';
import { MapH } from '../Handlers/Map.js';
import { MobsHandler } from '../Handlers/MobsHandler.js';
import { MobsInfo } from '../Handlers/MobsInfo.js';
import { WispCageHandler } from '../Handlers/WispCageHandler.js';
import { FishingHandler } from '../Handlers/FishingHandler.js';
import { getRadarWebSocketUrl } from './WebSocketConfig.js';
import { DrawingUtils } from './DrawingUtils.js';
import { Settings } from './Settings.js';

function getCanvasElement(id)
{
    const element = document.getElementById(id);

    if (!(element instanceof HTMLCanvasElement))
        throw new Error(`Missing canvas #${id}`);

    return element;
}

var canvasMap = getCanvasElement("mapCanvas");
var contextMap = canvasMap.getContext("2d");

var canvasGrid = getCanvasElement("gridCanvas");
var contextGrid = canvasGrid.getContext("2d");

var canvas = getCanvasElement("drawCanvas");
var context = canvas.getContext("2d");

var canvasFlash = getCanvasElement("flashCanvas");
var contextFlash = canvasFlash.getContext("2d");

var canvasOurPlayer = getCanvasElement("ourPlayerCanvas");
var contextOurPlayer = canvasOurPlayer .getContext("2d");


var canvasItems = getCanvasElement("thirdCanvas");
var contextItems = canvasItems.getContext("2d");

const settings = new Settings();

function updateConnectionStatus(message, state = 'idle') {
    const status = document.getElementById('connectionStatus');
    if (!status) return;

    status.textContent = message;
    status.dataset.state = state;
}

function showRadarError(message, error = undefined) {
    const errorBox = document.getElementById('radarError');
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



const harvestablesDrawing = new HarvestablesDrawing(settings);
const dungeonsHandler = new DungeonsHandler(settings);

var itemsInfo = new ItemsInfo();
var mobsInfo = new MobsInfo();

itemsInfo.initItems();
mobsInfo.initMobs();

var map = new MapH(-1);
const mapsDrawing = new MapDrawing(settings);

const chestsHandler = new ChestsHandler();
const mobsHandler = new MobsHandler(settings);
mobsHandler.updateMobInfo(mobsInfo.moblist);


const harvestablesHandler = new HarvestablesHandler(settings);
harvestablesHandler.setLivingResourceSource(mobsHandler);
const playersHandler = new PlayersHandler(settings);

const wispCageHandler = new WispCageHandler(settings);
const wispCageDrawing = new WispCageDrawing(settings);

const fishingHandler = new FishingHandler(settings);
const fishingDrawing = new FishingDrawing(settings);

const chestsDrawing = new ChestsDrawing(settings);
const mobsDrawing = new MobsDrawing(settings);
const playersDrawing = new PlayersDrawing(settings);
const dungeonsDrawing = new DungeonsDrawing(settings);
playersDrawing.updateItemsInfo(itemsInfo.iteminfo);


let lpX = 0.0;
let lpY = 0.0;

var flashTime = -1;

const drawingUtils = new DrawingUtils();
drawingUtils.initCanvas(canvas, context);
drawingUtils.initGridCanvas(canvasGrid, contextGrid);
drawingUtils.InitOurPlayerCanvas(canvasOurPlayer, contextOurPlayer);


const socket = new WebSocket(getRadarWebSocketUrl());
const debugState = {
    messages: 0,
    events: {},
    requests: {},
    responses: {},
    parseErrors: 0,
};

(window as any).camelRadarDebug = {
    getState: () => ({
        lpX,
        lpY,
        messages: debugState.messages,
        parseErrors: debugState.parseErrors,
        events: { ...debugState.events },
        requests: { ...debugState.requests },
        responses: { ...debugState.responses },
        players: playersHandler.playersInRange.map(player => ({
            id: player.id,
            nickname: player.nickname,
            posX: player.posX,
            posY: player.posY,
            hasPosition: Number.isFinite(player.posX) && Number.isFinite(player.posY),
        })),
        harvestables: harvestablesHandler.harvestableList.length,
        harvestableDetails: harvestablesHandler.getHarvestableList().map(harvestable => ({
            id: harvestable.id,
            type: harvestable.type,
            resourceType: harvestable.resourceType,
            tier: harvestable.tier,
            charges: harvestable.charges,
            size: harvestable.size,
            posX: harvestable.posX,
            posY: harvestable.posY,
        })),
        mobs: mobsHandler.mobsList.length,
        mobDetails: mobsHandler.getMobList().map(mob => ({
            id: mob.id,
            typeId: mob.typeId,
            type: mob.type,
            name: mob.name,
            tier: mob.tier,
            enchantmentLevel: mob.enchantmentLevel,
            posX: mob.posX,
            posY: mob.posY,
        })),
        hiddenLivingResources: mobsHandler.harvestablesNotGood.map(mob => ({
            id: mob.id,
            typeId: mob.typeId,
            type: mob.type,
            name: mob.name,
            tier: mob.tier,
            enchantmentLevel: mob.enchantmentLevel,
            posX: mob.posX,
            posY: mob.posY,
        })),
        recentLivingResources: mobsHandler.getRecentLivingResources(),
        mists: mobsHandler.mistList.length,
        chests: chestsHandler.chestsList.length,
    }),
};
socket.addEventListener('open', (event) => {
  updateConnectionStatus('Connected to local WebSocket stream', 'connected');
});

socket.addEventListener('close', () => {
  updateConnectionStatus('WebSocket stream closed. Restart Camel Radar if capture stopped.', 'closed');
});

socket.addEventListener('error', (event) => {
  updateConnectionStatus('WebSocket connection failed', 'error');
  showRadarError('Could not connect to the Camel Radar WebSocket server.', event);
});

socket.addEventListener('message', (event) => {
  let data;
  let extractedDictionary;

  try {
    data = JSON.parse(event.data);
    extractedDictionary = JSON.parse(data.dictionary);
  } catch (error) {
    debugState.parseErrors++;
    showRadarError('Received an unreadable WebSocket message.', error);
    return;
  }

  debugState.messages++;
  updateConnectionStatus(`Receiving stream (${debugState.messages} messages)`, 'connected');

  // Extract the string and dictionary from the object
  var extractedString = data.code;

  const parameters = extractedDictionary["parameters"] || {};
  const debugCode = parameters[252] ?? parameters[253] ?? "unknown";

  switch (extractedString)
  {
    case "request":
        debugState.requests[debugCode] = (debugState.requests[debugCode] || 0) + 1;
        onRequest(parameters);
        break;

    case "event":
        debugState.events[debugCode] = (debugState.events[debugCode] || 0) + 1;
        onEvent(parameters);
        break;

    case "items":
        break;

    case "response":
        debugState.responses[debugCode] = (debugState.responses[debugCode] || 0) + 1;
        onResponse(parameters);
        break;

    default:
        debugState.parseErrors++;
        showRadarError(`Unsupported WebSocket message type "${extractedString}".`);
        break;
  }
});


function onEvent(Parameters)
{
    const id = parseInt(Parameters[0]);
    const eventCode = Parameters[252];

    switch (eventCode)
    {
        // DEBUG

        /*case 506:
            console.log("MistsPlayerJoinedInfo");
            console.log(Parameters);
            break;

        case 474:
            console.log("CarriedObjectUpdate");
            console.log(Parameters);
            break;

        case 530:
            console.log("TemporaryFlaggingStatusUpdate ");
            console.log(Parameters);
            break;*/

        // END DEBUG

        case EventCodes.Leave:
            playersHandler.removePlayer(id);
            mobsHandler.removeMist(id);
            mobsHandler.removeMob(id);
            dungeonsHandler.RemoveDungeon(id);
            chestsHandler.removeChest(id);
            fishingHandler.RemoveFish(id);
            wispCageHandler.RemoveCage(id);
            break;

        case EventCodes.Move:
            const posX = Parameters[4];
            const posY = Parameters[5];

            playersHandler.updatePlayerPosition(id, posX, posY, Parameters);
            mobsHandler.updateMistPosition(id, posX, posY);
            mobsHandler.updateMobPosition(id, posX, posY);
            break;

        case EventCodes.NewCharacter:
            const ttt = playersHandler.handleNewPlayerEvent(Parameters, map.isBZ);
            flashTime = ttt < 0 ? flashTime : ttt;
            break;

        case EventCodes.NewSimpleHarvestableObjectList:
            harvestablesHandler.newSimpleHarvestableObject(Parameters);
            break;

        case EventCodes.NewHarvestableObject:
            harvestablesHandler.newHarvestableObject(id, Parameters);
            break;

        case EventCodes.HarvestableChangeState:
            harvestablesHandler.HarvestUpdateEvent(Parameters);
            break;

        case EventCodes.HarvestFinished:
            harvestablesHandler.harvestFinished(Parameters);
            break;

        case EventCodes.MobChangeState:
            mobsHandler.updateEnchantEvent(Parameters);
            break;

        case EventCodes.RegenerationHealthChanged:
            playersHandler.UpdatePlayerHealth(Parameters);
            break;

        case EventCodes.HealthUpdate:
            playersHandler.UpdatePlayerLooseHealth(Parameters);
            break;
        
        // TEST
        case EventCodes.MountHealthUpdate:
            break;

        // TEST
        case EventCodes.CharacterStats:
            break;

        // TEST
        case EventCodes.RegenerationHealthEnergyComboChanged:
            break;


        case EventCodes.CharacterEquipmentChanged:
            playersHandler.updateItems(id, Parameters);
            break;

        case EventCodes.NewMob:
            mobsHandler.NewMobEvent(Parameters);
            break;

        case EventCodes.Mounted:
            playersHandler.handleMountedPlayerEvent(id, Parameters);
            break;

        case EventCodes.NewRandomDungeonExit:
            dungeonsHandler.dungeonEvent(Parameters);
            break;

        case EventCodes.NewLootChest:
            chestsHandler.addChestEvent(Parameters);
            break;

        case EventCodes.NewMistsCagedWisp:
            wispCageHandler.NewCageEvent(Parameters);
            break;

        case EventCodes.MistsWispCageOpened:
            wispCageHandler.CageOpenedEvent(Parameters);
            break;

        case EventCodes.NewFishingZoneObject:
            fishingHandler.NewFishEvent(Parameters);
            break;

        case EventCodes.FishingFinished:
            fishingHandler.FishingEnd(Parameters);
            break;

        case 590:
            break;

        /*default:
            console.log("default");
            console.log(Parameters);*/
    }
};

function onRequest(Parameters)
{ 
    // Player moving
    if (Parameters[253] == 21 || Parameters[253] == 22)
    {
        const position = Array.isArray(Parameters[1]) ? Parameters[1] : Parameters[3];

        if (Array.isArray(position) && position.length >= 2)
        {
            lpX = position[0];
            lpY = position[1];
        }
    }
}

function onResponse(Parameters)
{
    // Player change cluster
    if (Parameters[253] == 35)
    {
        const previousMapId = map.id;
        map.id = Parameters[0];

        if (previousMapId !== -1 && previousMapId !== map.id)
        {
            ClearHandlers();
        }
    }
    // All data on the player joining the map (us)
    else if (Parameters[253] == 2)
    {
        if (Array.isArray(Parameters[9]) && Parameters[9].length >= 2)
        {
            lpX = Parameters[9][0];
            lpY = Parameters[9][1];
        }

        map.isBZ = Parameters[103] == 2;

        /*console.log()
        console.log("Join")
        console.log(Parameters)*/

        ClearHandlers();
    }
    // GetCharacterStats  
    else if (Parameters[253] == 137)
    {
        console.log()
        console.log("GetCharacterStats")
        console.log(Parameters)
    }
};

requestAnimationFrame(gameLoop);

function render()
{

    context.clearRect(0, 0, canvas.width, canvas.height);
    contextMap.clearRect(0, 0, canvasMap.width, canvasMap.height);
    contextFlash.clearRect(0, 0, canvasFlash.width, canvasFlash.height);

    mapsDrawing.Draw(contextMap, map);

    harvestablesDrawing.invalidate(context, harvestablesHandler.harvestableList);

    mobsDrawing.invalidate(context, mobsHandler.mobsList, mobsHandler.mistList);
    chestsDrawing.invalidate(context, chestsHandler.chestsList);
    wispCageDrawing.Draw(context, wispCageHandler.cages);
    fishingDrawing.Draw(context, fishingHandler.fishes);
    dungeonsDrawing.Draw(context, dungeonsHandler.dungeonList);
    playersDrawing.invalidate(context, playersHandler.playersInRange);

    // Flash
    if (settings.settingFlash && flashTime >= 0)
    {
        contextFlash.rect(0, 0, 500, 500);
        contextFlash.rect(20, 20, 460, 460);

        contextFlash.fillStyle = 'red';
        contextFlash.fill('evenodd');
    }
}


var previousTime = performance.now();

function gameLoop() {
    update();
    render();
    requestAnimationFrame(gameLoop);
}



function update() {

    const currentTime = performance.now();
    const deltaTime = currentTime - previousTime;
    const t = Math.min(1, deltaTime / 100);



    if (settings.showMapBackground)
        mapsDrawing.interpolate(map, lpX, lpY, t);

    harvestablesHandler.removeNotInRange(lpX, lpY);
    harvestablesDrawing.interpolate(harvestablesHandler.harvestableList, lpX, lpY, t);

    mobsHandler.refreshLivingResources();
    mobsDrawing.interpolate(mobsHandler.mobsList, mobsHandler.mistList, lpX, lpY, t);


    chestsDrawing.interpolate(chestsHandler.chestsList, lpX, lpY, t);
    wispCageDrawing.Interpolate(wispCageHandler.cages, lpX, lpY, t);
    fishingDrawing.Interpolate(fishingHandler.fishes, lpX, lpY, t);
    dungeonsDrawing.interpolate(dungeonsHandler.dungeonList, lpX, lpY, t);
    playersDrawing.interpolate(playersHandler.playersInRange, lpX, lpY, t);

    // Flash
    if (flashTime >= 0)
    {
        flashTime -= t;
    }

    previousTime = currentTime;
}

function drawItems() {

    contextItems.clearRect(0, 0, canvasItems.width, canvasItems.height);

    if (settings.settingItems)
    {
        playersDrawing.drawItems(contextItems, canvasItems, playersHandler.playersInRange, settings.settingItemsDev);
    }

}
const intervalItems = 500;
setInterval(drawItems, intervalItems);

function checkLocalStorage()
{
    settings.update();
    setDrawingViews();
}

const interval = 300;
setInterval(checkLocalStorage, interval)



document.getElementById("button")?.addEventListener("click", function () {
    ClearHandlers();
});

function ClearHandlers()
{
    chestsHandler.chestsList = [];
    dungeonsHandler.dungeonList = [];
    fishingHandler.Clear();
    harvestablesHandler.Clear();
    mobsHandler.Clear();
    playersHandler.Clear();
    wispCageHandler.Clear();
}

setDrawingViews();

function setDrawingViews() {
    const mainWindowMarginXValue = localStorage.getItem("mainWindowMarginX");
    const mainWindowMarginYValue = localStorage.getItem("mainWindowMarginY");
    const itemsWindowMarginXValue = localStorage.getItem("itemsWindowMarginX");
    const itemsWindowMarginYValue = localStorage.getItem("itemsWindowMarginY");
    const settingItemsBorderValue = localStorage.getItem("settingItemsBorder");
    const buttonMarginXValue = localStorage.getItem("buttonMarginX");
    const buttonMarginYValue = localStorage.getItem("buttonMarginY");

    const itemsWidthValue = localStorage.getItem("itemsWidth");
    const itemsHeightValue = localStorage.getItem("itemsHeight");

    // Check if the values exist in local storage and handle them
    if (mainWindowMarginXValue !== null) {
        const bottomCanvas = document.getElementById('bottomCanvas');
        const drawCanvas = document.getElementById('drawCanvas');

        if (bottomCanvas) bottomCanvas.style.left = mainWindowMarginXValue + "px";
        if (drawCanvas) drawCanvas.style.left = mainWindowMarginXValue + "px";
    }

    if (mainWindowMarginYValue !== null) {
        const bottomCanvas = document.getElementById('bottomCanvas');
        const drawCanvas = document.getElementById('drawCanvas');

        if (drawCanvas) drawCanvas.style.top = mainWindowMarginYValue + "px";
        if (bottomCanvas) bottomCanvas.style.top = mainWindowMarginYValue + "px";
    }

    if (itemsWindowMarginXValue !== null) {
        document.getElementById('thirdCanvas').style.left = itemsWindowMarginXValue + "px";
    }

    if (itemsWindowMarginYValue !== null) {
        document.getElementById('thirdCanvas').style.top = itemsWindowMarginYValue + "px";
    }

    if (itemsWidthValue !== null) {
        document.getElementById('thirdCanvas').style.width = itemsWidthValue + "px";
    }

    if (itemsHeightValue !== null) {
        document.getElementById('thirdCanvas').style.height = itemsHeightValue + "px";
    }

    if (settingItemsBorderValue !== null) {
        // Apply border based on the settingItemsBorderValue
        if (settingItemsBorderValue === "true") {

            document.getElementById('thirdCanvas').style.border = "2px solid grey";
        } else {

            document.getElementById('thirdCanvas').style.border = "none";
        }
    }

    if (buttonMarginXValue !== null) {
        document.getElementById('button').style.left = buttonMarginXValue + "px";
    }

    if (buttonMarginYValue !== null) {
        document.getElementById('button').style.top = buttonMarginYValue + "px";
    }



}
