class Player {
    [key: string]: any;

    constructor(
        posX = 0,
        posY = 0,
        id = null,
        nickname = "",
        guildName1 = "",
        currentHealth = 0,
        initialHealth = 0,
        items = null,
        flagId = 0,
    ) {
        this.posX = posX;
        this.posY = posY;
        this.oldPosX = posX;
        this.oldPosY = posY;
        this.id = id;
        this.nickname = nickname;
        this.guildName = guildName1;
        this.hX = 0;
        this.hY = 0;
        this.currentHealth = currentHealth;
        this.initialHealth = initialHealth;
        this.items = items;
        this.flagId = flagId;
        this.mounted = false; // Initialize mounted status as false
    }

    setMounted(mounted) {
        this.mounted = mounted;
    }
}

function readPosition(value)
{
    if (Array.isArray(value) && value.length >= 2)
    {
        const x = Number(value[0]);
        const y = Number(value[1]);
        return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
    }

    return null;
}

export class PlayersHandler {
    [key: string]: any;

    constructor(settings) {
        this.playersInRange = [];
        this.playerPositions = new Map();
        this.localPlayer = new Player();
        this.invalidate = false;

        this.settings = settings;

        this.ignorePlayers = [];
        this.ignoreGuilds = [];
        this.ignoreAlliances = [];

        this.alreadyIgnoredPlayers = [];

        this.settings.ignoreList.forEach((element) => {
            const name = element['Name'];

            switch (element['Type']) {
                case 'Player':
                    this.ignorePlayers.push(name);
                    break;

                case 'Guild':
                    this.ignoreGuilds.push(name);
                    break;

                case 'Alliance':
                    this.ignoreAlliances.push(name);
                    break;
            
                default: // Default is player
                    this.ignorePlayers.push(name);
                    break;
            }
        });
    }

    getPlayersInRange() {
        try {
            return [...this.playersInRange]; // Create a copy of the array
        } finally {

        }
    }

    updateItems(id, Parameters) {

        let items = null;

        try {
            items = Parameters[2];
        }
        catch
        {
            items = null;
        }

        if (items != null) {
            this.playersInRange.forEach(playerOne => {
                if (playerOne.id === id) {
                    playerOne.items = items;
                }
            });
        }
    }

    handleNewPlayerEvent(Parameters, isBZ)
    {
        /*console.log()
        console.log("New Player")
        console.log(Parameters);*/

        if (!this.settings.settingDot)
            return -1;

        /* General */
        const id = Parameters[0];
        const nickname = Parameters[1] || "Unknown";

        if (this.alreadyIgnoredPlayers.find(name => name === nickname.toUpperCase()))
            return -1;

        if (this.ignorePlayers.find(name => name === nickname.toUpperCase()))
        {
            this.alreadyIgnoredPlayers.push(nickname.toUpperCase());
            return -1;
        }

        const guildName = String(Parameters[8]); 

        if (this.ignoreGuilds.find(name => name === guildName.toUpperCase()))
        {
            this.alreadyIgnoredPlayers.push(nickname.toUpperCase());
            return -1;
        }

        const alliance = String(Parameters[49]);

        if (this.ignoreAlliances.find(name => name === alliance.toUpperCase()))
        {
            this.alreadyIgnoredPlayers.push(nickname.toUpperCase());
            return -1;
        }

        /* Position */
        const position = readPosition(Parameters[14]);

       

        /* Health */
        const currentHealth = Parameters[22];
        const initialHealth = Parameters[23];

        /* Items & flag */
        const items = Parameters[40];
        const flagId = Parameters[53] | 0;

        if (isBZ)
        {
            if (!this.settings.settingDangerousPlayers) return -1;
        }
        else if ((flagId == 0 && !this.settings.settingPassivePlayers)
            || (flagId >= 1 && flagId <= 6 && !this.settings.settingFactionPlayers)
            || (flagId == 255 && !this.settings.settingDangerousPlayers)
        ) return -1;

        return this.addPlayer(position?.x, position?.y, id, nickname, guildName, currentHealth, initialHealth, items, this.settings.settingSound, flagId);
    }

    handleMountedPlayerEvent(id, parameters)
    {
        let ten = parameters[10];
    
        let mounted = parameters[11];

        if (mounted == "true" || mounted == true)
        {
            this.updatePlayerMounted(id, true);
        } 
        else if (ten == "-1")
        {
            this.updatePlayerMounted(id, true);
        } 
        else
        {
            this.updatePlayerMounted(id, false);
        }
    }

    addPlayer(posX, posY, id, nickname, guildName, currentHealth, initialHealth, items, sound, flagId)
    {
        const existingPlayer = this.playersInRange.find(player => player.id === id);
        const lastPosition = this.playerPositions.get(id);

        if ((!Number.isFinite(posX) || !Number.isFinite(posY)) && lastPosition)
        {
            posX = lastPosition.posX;
            posY = lastPosition.posY;
        }

        if (existingPlayer)
        {
            if (Number.isFinite(posX) && Number.isFinite(posY))
            {
                existingPlayer.posX = posX;
                existingPlayer.posY = posY;
            }

            return -1;
        }

        const player = new Player(posX, posY, id, nickname, guildName, currentHealth, initialHealth, items, flagId);
        this.playersInRange.push(player);

        if (!sound) return 2;

        const audio = new Audio('/sounds/player.mp3');
        audio.play();

        return 2;
    }

    updateLocalPlayerNextPosition(posX, posY) {
        if (!Number.isFinite(posX) || !Number.isFinite(posY))
            return;

        this.localPlayer.oldPosX = this.localPlayer.posX;
        this.localPlayer.oldPosY = this.localPlayer.posY;
        this.localPlayer.posX = posX;
        this.localPlayer.posY = posY;
    }

    updatePlayerMounted(id, mounted)
    {
        for (const player of this.playersInRange) {
            if (player.id === id) {
                player.setMounted(mounted);
                break;
            }
        }
    }

    removePlayer(id)
    {
        this.playersInRange = this.playersInRange.filter(player => player.id !== id);
        this.playerPositions.delete(id);
    }

    updateLocalPlayerPosition(posX, posY) {
        if (!Number.isFinite(posX) || !Number.isFinite(posY))
            return;

        this.localPlayer.oldPosX = this.localPlayer.posX;
        this.localPlayer.oldPosY = this.localPlayer.posY;
        this.localPlayer.posX = posX;
        this.localPlayer.posY = posY;
    }

    localPlayerPosX() {
        return Number.isFinite(this.localPlayer.posX) ? this.localPlayer.posX : 0;
    }

    localPlayerPosY() {
        return Number.isFinite(this.localPlayer.posY) ? this.localPlayer.posY : 0;
     }

    updatePlayerPosition(id, posX, posY, parameters)
    {
        if (!Number.isFinite(posX) || !Number.isFinite(posY))
            return;

        this.playerPositions.set(id, { posX, posY });

        for (const player of this.playersInRange)
        {
            if (player.id === id)
            {
                player.posX = posX;
                player.posY = posY;
                return;
            }
        }
    }

    UpdatePlayerHealth(Parameters)
    {
        var uPlayer = this.playersInRange.find(player => player.id === Parameters[0]);

        if (!uPlayer) return;

        /*console.log();
        console.log("RegenerationHealthChanged");
        console.log(Parameters);*/

        uPlayer.currentHealth = Parameters[2];
        uPlayer.initialHealth = Parameters[3];
    }

    UpdatePlayerLooseHealth(Parameters)
    {
        var uPlayer = this.playersInRange.find(player => player.id === Parameters[0]);

        if (!uPlayer) return;

        uPlayer.currentHealth = Parameters[3];
    }

    Clear()
    {
        this.playersInRange = [];
        this.playerPositions.clear();
        this.alreadyIgnoredPlayers = [];
    }
}
