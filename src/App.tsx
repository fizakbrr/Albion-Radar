import { useCallback, useEffect, useState, type ReactNode } from "react"
import {
  AlertCircle,
  Archive,
  Boxes,
  Bug,
  ChevronRight,
  CircleOff,
  Compass,
  Database,
  Eye,
  Map,
  Menu,
  Moon,
  PackageSearch,
  Radar,
  RotateCcw,
  Sun,
  Swords,
  Trash2,
  Users,
  XCircle,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

type IconComponent = typeof Users

type RouteKey = "players" | "resources" | "enemies" | "signals" | "map" | "ignore"

type NavItem = {
  key: RouteKey
  path: string
  label: string
  description: string
  icon: IconComponent
}

type IgnoreType = "Player" | "Guild" | "Alliance"

type IgnoreEntry = {
  Name: string
  Type: IgnoreType
}

type EnchantMatrixValue = Record<"e0" | "e1" | "e2" | "e3" | "e4", boolean[]>

const navItems: NavItem[] = [
  {
    key: "players",
    path: "/home",
    label: "PvP & Players",
    description: "Detection and alerts",
    icon: Users,
  },
  {
    key: "resources",
    path: "/resources",
    label: "Resources",
    description: "Tiers and overlays",
    icon: Boxes,
  },
  {
    key: "enemies",
    path: "/enemies",
    label: "Enemies",
    description: "Mobs and thresholds",
    icon: Swords,
  },
  {
    key: "signals",
    path: "/chests",
    label: "Other Signals",
    description: "Chests, mists, cages",
    icon: Archive,
  },
  {
    key: "map",
    path: "/map",
    label: "Map",
    description: "Background rendering",
    icon: Map,
  },
  {
    key: "ignore",
    path: "/ignorelist",
    label: "Ignore List",
    description: "Hidden alert names",
    icon: CircleOff,
  },
]

const routeMap: Record<string, RouteKey> = {
  "/": "players",
  "/home": "players",
  "/resources": "resources",
  "/enemies": "enemies",
  "/chests": "signals",
  "/map": "map",
  "/ignorelist": "ignore",
}

const staticResources = [
  ["Fiber", "settingStaticFiberEnchants"],
  ["Hide", "settingStaticHideEnchants"],
  ["Wood", "settingStaticWoodEnchants"],
  ["Ore", "settingStaticOreEnchants"],
  ["Rock", "settingStaticRockEnchants"],
] as const

const livingResources = [
  ["Fiber", "settingLivingFiberEnchants"],
  ["Hide", "settingLivingHideEnchants"],
  ["Wood", "settingLivingWoodEnchants"],
  ["Ore", "settingLivingOreEnchants"],
  ["Rock", "settingLivingRockEnchants"],
] as const

function readBoolean(key: string, defaultValue = false) {
  const value = window.localStorage.getItem(key)
  if (value === null) return defaultValue
  return value === "true"
}

function writeBoolean(key: string, value: boolean) {
  window.localStorage.setItem(key, String(value))
  window.dispatchEvent(new CustomEvent("camel-settings-change", { detail: { key, value } }))
}

function readJson<T>(key: string, fallback: T): T {
  const raw = window.localStorage.getItem(key)
  if (!raw) return fallback

  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value))
  window.dispatchEvent(new CustomEvent("camel-settings-change", { detail: { key, value } }))
}

function createEnchantMatrix(): EnchantMatrixValue {
  return {
    e0: Array(8).fill(false),
    e1: Array(8).fill(false),
    e2: Array(8).fill(false),
    e3: Array(8).fill(false),
    e4: Array(8).fill(false),
  }
}

function useBooleanSetting(key: string, defaultValue = false) {
  const [value, setValue] = useState(() => readBoolean(key, defaultValue))

  const update = useCallback(
    (next: boolean) => {
      setValue(next)
      writeBoolean(key, next)
    },
    [key],
  )

  return [value, update] as const
}

function useJsonSetting<T>(key: string, fallback: T) {
  const [value, setValue] = useState(() => readJson(key, fallback))

  const update = useCallback(
    (next: T) => {
      setValue(next)
      writeJson(key, next)
    },
    [key],
  )

  return [value, update] as const
}

function usePathname() {
  const [path, setPath] = useState(() => window.location.pathname)

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname)
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [])

  const navigate = useCallback((nextPath: string) => {
    window.history.pushState(null, "", nextPath)
    setPath(nextPath)
  }, [])

  return { path, navigate }
}

function useTheme() {
  const [dark, setDark] = useState(() => {
    const stored = window.localStorage.getItem("dark")
    if (stored !== null) return stored === "true"
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false
  })

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark)
    window.localStorage.setItem("dark", String(dark))
  }, [dark])

  return { dark, toggleTheme: () => setDark((value) => !value) }
}

function openTool(path: string, name: string) {
  const popup = window.open(path, name)
  if (popup) popup.focus()
}

function App() {
  const { path, navigate } = usePathname()
  const theme = useTheme()

  if (path === "/drawing") {
    return (
      <TooltipProvider>
        <RadarWindow />
      </TooltipProvider>
    )
  }

  if (path === "/items") {
    return (
      <TooltipProvider>
        <ItemsWindow />
      </TooltipProvider>
    )
  }

  const activeKey = routeMap[path] ?? "players"

  return (
    <TooltipProvider>
      <AppShell activeKey={activeKey} navigate={navigate} theme={theme}>
        {routeMap[path] ? <PageRouter route={activeKey} /> : <NotFoundPage path={path} navigate={navigate} />}
      </AppShell>
    </TooltipProvider>
  )
}

function AppShell({
  activeKey,
  navigate,
  theme,
  children,
}: {
  activeKey: RouteKey
  navigate: (path: string) => void
  theme: ReturnType<typeof useTheme>
  children: ReactNode
}) {
  const activeItem = navItems.find((item) => item.key === activeKey) ?? navItems[0]

  const nav = <Navigation activeKey={activeKey} navigate={navigate} />

  return (
    <div className="min-h-dvh bg-[radial-gradient(circle_at_14%_-8%,rgba(177,91,40,0.22),transparent_25rem),linear-gradient(145deg,#0f150f_0%,#090d0a_58%,#11100b_100%)] text-foreground">
      <div className="grid min-h-dvh lg:grid-cols-[19.5rem_minmax(0,1fr)]">
        <aside className="hidden border-r bg-sidebar/78 backdrop-blur-xl lg:block">
          <div className="flex h-dvh flex-col gap-5 p-5">
            <BrandButton onClick={() => navigate("/home")} />
            <Separator />
            <ScrollArea className="min-h-0 flex-1 pr-2">{nav}</ScrollArea>
            <LaunchPanel />
            <CreditNotice />
          </div>
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-xl">
            <div className="flex min-h-20 items-center justify-between gap-5 px-4 lg:px-9">
              <div className="flex min-w-0 items-center gap-4">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="icon" className="lg:hidden" aria-label="Open navigation">
                      <Menu />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-80 p-0">
                    <SheetHeader className="sr-only">
                      <SheetTitle>Camel Radar navigation</SheetTitle>
                    </SheetHeader>
                    <div className="flex h-full flex-col gap-5 p-5">
                      <BrandButton onClick={() => navigate("/home")} />
                      <Separator />
                      <ScrollArea className="min-h-0 flex-1 pr-2">{nav}</ScrollArea>
                      <LaunchPanel />
                    </div>
                  </SheetContent>
                </Sheet>

                <div className="min-w-0">
                  <p className="hidden text-sm font-medium text-muted-foreground sm:block">{activeItem.description}</p>
                  <h1 className="truncate text-xl font-[760] tracking-normal sm:text-2xl">{activeItem.label}</h1>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" onClick={theme.toggleTheme} aria-label="Toggle theme">
                      {theme.dark ? <Sun /> : <Moon />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Toggle theme</TooltipContent>
                </Tooltip>
                <Button onClick={() => openTool("/drawing", "CamelRadarWindow")} aria-label="Launch Radar">
                  <Radar />
                  <span className="hidden sm:inline">Launch Radar</span>
                </Button>
              </div>
            </div>
          </header>

          <main className="px-4 py-8 lg:px-12 lg:py-12">{children}</main>
        </div>
      </div>
    </div>
  )
}

function BrandButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="ghost" className="h-auto justify-start gap-4 px-0 py-1 text-left hover:bg-transparent" onClick={onClick}>
      <img src="/images/camel-logo.png" alt="Camel Radar logo" className="h-[4.75rem] w-[4.75rem] shrink-0 object-contain" />
      <span className="grid gap-1">
        <span className="text-lg font-[780] leading-none">Camel Radar</span>
        <span className="text-sm font-medium text-muted-foreground">local capture UI</span>
      </span>
    </Button>
  )
}

function Navigation({ activeKey, navigate }: { activeKey: RouteKey; navigate: (path: string) => void }) {
  return (
    <nav className="grid gap-1">
      {navItems.map((item) => {
        const Icon = item.icon
        const active = item.key === activeKey
        return (
          <Button
            key={item.key}
            variant={active ? "secondary" : "ghost"}
            className="h-auto justify-start gap-3 overflow-hidden px-3 py-3"
            onClick={() => navigate(item.path)}
          >
            <Icon className="size-4 shrink-0" />
            <span className="grid min-w-0 text-left">
              <span className="truncate text-[0.95rem] font-[720]">{item.label}</span>
              <span className="truncate text-[0.82rem] font-medium text-muted-foreground">{item.description}</span>
            </span>
          </Button>
        )
      })}
    </nav>
  )
}

function LaunchPanel() {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base">Live tools</CardTitle>
        <CardDescription>Open the canvas views in focused windows.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <Button onClick={() => openTool("/drawing", "CamelRadarWindow")}>
          <Radar />
          Radar window
        </Button>
        <Button variant="outline" onClick={() => openTool("/items", "CamelItemsWindow")}>
          <PackageSearch />
          Items window
        </Button>
      </CardContent>
    </Card>
  )
}

function CreditNotice() {
  return (
    <Alert className="rounded-lg">
      <Database className="size-4" />
      <AlertTitle>Credits retained</AlertTitle>
      <AlertDescription>The README preserves former developer and upstream project attribution.</AlertDescription>
    </Alert>
  )
}

function PageRouter({ route }: { route: RouteKey }) {
  switch (route) {
    case "players":
      return <PlayersPage />
    case "resources":
      return <ResourcesPage />
    case "enemies":
      return <EnemiesPage />
    case "signals":
      return <SignalsPage />
    case "map":
      return <MapPage />
    case "ignore":
      return <IgnoreListPage />
    default:
      return null
  }
}

function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
      <div className="max-w-3xl">
        <span className="mb-4 block text-sm font-[760] text-primary">
          {eyebrow}
        </span>
        <h2 className="text-4xl font-[820] leading-[0.96] tracking-normal text-balance lg:text-6xl">{title}</h2>
        <p className="mt-5 max-w-[64ch] text-base font-medium leading-7 text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  )
}

function SettingSwitch({
  storageKey,
  title,
  description,
  defaultValue = false,
  disabled = false,
}: {
  storageKey: string
  title: string
  description: string
  defaultValue?: boolean
  disabled?: boolean
}) {
  const [checked, setChecked] = useBooleanSetting(storageKey, defaultValue)
  const id = `setting-${storageKey}`

  return (
    <div className="flex min-h-24 items-start justify-between gap-5 rounded-lg border bg-background/42 p-4">
      <div className="grid gap-1.5">
        <Label htmlFor={id} className="text-[0.98rem] font-[740]">
          {title}
        </Label>
        <p className="text-sm font-medium leading-5 text-muted-foreground">{description}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={setChecked} disabled={disabled} />
    </div>
  )
}

function PlayersPage() {
  return (
    <section className="w-full max-w-[1360px]">
      <PageHeader
        eyebrow="Player detection"
        title="Tune the radar before you launch."
        description="These controls update the same local settings used by the live canvas renderer. Defaults favor visible player dots and practical alert filters."
        action={
          <Button onClick={() => openTool("/items", "CamelItemsWindow")} variant="outline">
            <PackageSearch />
            Open items
          </Button>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1.45fr_0.95fr]">
        <Card>
          <CardHeader>
            <CardTitle>Display and alerts</CardTitle>
            <CardDescription>Choose what the radar draws and how it alerts you.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <SettingSwitch
              storageKey="settingDot"
              title="Radar dots"
              description="Render detected players on the radar canvas."
              defaultValue
            />
            <SettingSwitch storageKey="settingItems" title="Items" description="Draw detected player equipment in the items window." />
            <SettingSwitch
              storageKey="settingItemsDev"
              title="Item IDs"
              description="Show raw item identifiers beside equipment for debugging."
            />
            <SettingSwitch storageKey="settingFlash" title="Screen flash" description="Flash the radar window when a player is detected." />
            <SettingSwitch storageKey="settingSound" title="Sound" description="Play the local alert sound for player detection." />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Player types</CardTitle>
            <CardDescription>Filter noisy detections without changing packet capture.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <SettingSwitch
              storageKey="settingPassivePlayers"
              title="Passive players"
              description="Include blue or neutral nearby players."
              defaultValue
            />
            <SettingSwitch
              storageKey="settingFactionPlayers"
              title="Faction players"
              description="Include faction-flagged players."
              defaultValue
            />
            <SettingSwitch
              storageKey="settingDangerousPlayers"
              title="Dangerous players"
              description="Include yellow, red, and black player flags."
              defaultValue
            />
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

function ResourcesPage() {
  return (
    <section className="w-full max-w-[1360px]">
      <PageHeader
        eyebrow="Harvestables"
        title="Resource filters without visual clutter."
        description="Enable tiers and enchant levels for static and living resources. Unavailable low-tier enchant cells stay disabled."
      />

      <Tabs defaultValue="static" className="grid gap-4">
        <TabsList className="w-fit">
          <TabsTrigger value="static">Static resources</TabsTrigger>
          <TabsTrigger value="living">Living resources</TabsTrigger>
          <TabsTrigger value="debug">Debug</TabsTrigger>
        </TabsList>

        <TabsContent value="static" className="mt-0 grid gap-4 lg:grid-cols-2">
          {staticResources.map(([title, key]) => (
            <EnchantMatrix key={key} title={title} storageKey={key} />
          ))}
        </TabsContent>

        <TabsContent value="living" className="mt-0 grid gap-4 lg:grid-cols-2">
          {livingResources.map(([title, key]) => (
            <EnchantMatrix key={key} title={title} storageKey={key} />
          ))}
        </TabsContent>

        <TabsContent value="debug" className="mt-0 grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Other resources</CardTitle>
              <CardDescription>Optional non-harvestable resource signals.</CardDescription>
            </CardHeader>
            <CardContent>
              <SettingSwitch storageKey="settingFishing" title="Fishing pools" description="Render fishing zones when packets include them." />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Debug overlays</CardTitle>
              <CardDescription>Use these when validating resource parser output.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <SettingSwitch storageKey="settingRawSize" title="Resource size" description="Show raw size values." />
              <SettingSwitch storageKey="settingLivingResourcesHP" title="Living resource health" description="Show health values." />
              <SettingSwitch storageKey="settingLivingResourcesID" title="Living resource IDs" description="Show object identifiers." />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </section>
  )
}

function EnchantMatrix({ title, storageKey }: { title: string; storageKey: string }) {
  const [matrix, setMatrix] = useJsonSetting<EnchantMatrixValue>(storageKey, createEnchantMatrix())
  const rows = Object.keys(matrix) as Array<keyof EnchantMatrixValue>

  const updateCell = (row: keyof EnchantMatrixValue, index: number, checked: boolean) => {
    const next = {
      ...matrix,
      [row]: matrix[row].map((value, valueIndex) => (valueIndex === index ? checked : value)),
    }
    setMatrix(next)
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>{title}</CardTitle>
        <CardDescription>Tier and enchant filters</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">E/T</TableHead>
              {Array.from({ length: 8 }, (_, index) => (
                <TableHead key={index} className="text-center">
                  T{index + 1}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row}>
                <TableCell className="font-medium uppercase">{row}</TableCell>
                {matrix[row].map((enabled, index) => {
                  const unavailable = row !== "e0" && index < 3
                  return (
                    <TableCell key={`${row}-${index}`} className="text-center">
                      <Checkbox
                        checked={enabled}
                        disabled={unavailable}
                        aria-label={`${title} ${row.toUpperCase()} T${index + 1}`}
                        onCheckedChange={(checked) => updateCell(row, index, checked === true)}
                      />
                    </TableCell>
                  )
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

function EnemiesPage() {
  const [minimumEnabled, setMinimumEnabled] = useBooleanSetting("settingShowMinimumHealthEnemies")
  const [minimumHealth, setMinimumHealth] = useState(() => window.localStorage.getItem("settingTextMinimumHealthEnemies") || "2100")

  const updateMinimumHealth = (value: string) => {
    const sanitized = value.replace(/[^\d]/g, "")
    setMinimumHealth(sanitized)
    window.localStorage.setItem("settingTextMinimumHealthEnemies", sanitized || "0")
  }

  return (
    <section className="w-full max-w-[1360px]">
      <PageHeader
        eyebrow="Enemy signals"
        title="Keep the enemy feed deliberate."
        description="Control classic enemy tiers, mist bosses, event enemies, and debug overlays from a compact shadcn interface."
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Classic enemies</CardTitle>
            <CardDescription>Mob difficulty filters used by the renderer.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="grid gap-3 md:grid-cols-2">
              <SettingSwitch storageKey="settingNormalEnemy" title="Normal" description="Base enemy objects." />
              <SettingSwitch storageKey="settingMediumEnemy" title="Medium" description="Medium difficulty enemies." />
              <SettingSwitch storageKey="settingEnchantedEnemy" title="Enchanted" description="Enchanted enemy variants." />
              <SettingSwitch storageKey="settingMiniBossEnemy" title="Mini boss" description="Mini boss events." />
              <SettingSwitch storageKey="settingBossEnemy" title="Boss" description="Boss-level enemy events." />
              <SettingSwitch storageKey="settingShowUnmanagedEnemies" title="Unmanaged IDs" description="Show enemies whose IDs are not mapped." />
            </div>
            <Separator />
            <div className="grid gap-3 rounded-lg border bg-background/45 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Label htmlFor="minimum-health-switch" className="font-semibold">
                    Minimum HP filter
                  </Label>
                  <p className="text-sm text-muted-foreground">Only show enemies at or above a health threshold.</p>
                </div>
                <Switch id="minimum-health-switch" checked={minimumEnabled} onCheckedChange={setMinimumEnabled} />
              </div>
              <Input
                inputMode="numeric"
                disabled={!minimumEnabled}
                value={minimumHealth}
                onChange={(event) => updateMinimumHealth(event.target.value)}
                aria-label="Minimum enemy health"
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Mists</CardTitle>
              <CardDescription>Boss-like mist encounters.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              <SettingSwitch storageKey="settingBossCrystalSpider" title="Crystal Spider" description="Detect crystal spider events." />
              <SettingSwitch storageKey="settingBossFairyDragon" title="Fairy Dragon" description="Detect fairy dragon events." />
              <SettingSwitch storageKey="settingBossVeilWeaver" title="Veil Weaver" description="Detect veil weaver events." />
              <SettingSwitch storageKey="settingBossGriffin" title="Griffin" description="Detect griffin events." />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Other and debug</CardTitle>
              <CardDescription>Additional enemy streams and parser overlays.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              <SettingSwitch storageKey="settingAvaloneDrones" title="Avalonian drones" description="Show Avalonian drone events." />
              <SettingSwitch storageKey="settingShowEventEnemies" title="Event enemies" description="Show temporary event enemies." />
              <SettingSwitch storageKey="settingEnemiesHP" title="Enemy HP" description="Draw HP values." />
              <SettingSwitch storageKey="settingEnemiesID" title="Enemy IDs" description="Draw raw enemy IDs." />
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}

function SignalsPage() {
  return (
    <section className="w-full max-w-[1360px]">
      <PageHeader
        eyebrow="Other signals"
        title="Chests, mists, dungeons, and cages."
        description="These options keep the utility feed focused on the objectives you care about during a run."
      />

      <Tabs defaultValue="chests" className="grid gap-4">
        <TabsList className="w-fit">
          <TabsTrigger value="chests">Chests</TabsTrigger>
          <TabsTrigger value="mists">Mists</TabsTrigger>
          <TabsTrigger value="dungeons">Dungeons</TabsTrigger>
        </TabsList>

        <TabsContent value="chests" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Chest colors</CardTitle>
              <CardDescription>Choose which chest rarities appear on the radar.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <SettingSwitch storageKey="settingChestGreen" title="Green" description="Show green chests." />
              <SettingSwitch storageKey="settingChestBlue" title="Blue" description="Show blue chests." />
              <SettingSwitch storageKey="settingChestPurple" title="Purple" description="Show purple chests." />
              <SettingSwitch storageKey="settingChestYellow" title="Yellow" description="Show yellow chests." />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mists" className="mt-0 grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Mist type</CardTitle>
              <CardDescription>Solo, duo, and wisp cage signals.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <SettingSwitch storageKey="settingMistSolo" title="Solo" description="Show solo mist entrances." />
              <SettingSwitch storageKey="settingMistDuo" title="Duo" description="Show duo mist entrances." />
              <SettingSwitch storageKey="settingCage" title="Wisp cages" description="Show unopened wisp cages." />
            </CardContent>
          </Card>
          <EnchantToggles prefix="settingMistE" title="Mist enchant" />
        </TabsContent>

        <TabsContent value="dungeons" className="mt-0 grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Dungeon type</CardTitle>
              <CardDescription>Dungeon and gate signals.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <SettingSwitch storageKey="settingDungeonSolo" title="Solo" description="Show solo dungeons." />
              <SettingSwitch storageKey="settingDungeonDuo" title="Group" description="Show group dungeons." />
              <SettingSwitch storageKey="settingDungeonCorrupted" title="Corrupted" description="Show corrupted dungeon entrances." />
              <SettingSwitch storageKey="settingDungeonHellgate" title="Hellgate" description="Show hellgate entrances." />
            </CardContent>
          </Card>
          <EnchantToggles prefix="settingDungeonE" title="Dungeon enchant" />
        </TabsContent>
      </Tabs>
    </section>
  )
}

function EnchantToggles({ prefix, title }: { prefix: string; title: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Enable the enchant levels to render.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {Array.from({ length: 5 }, (_, index) => (
          <SettingSwitch
            key={index}
            storageKey={`${prefix}${index}`}
            title={`E${index}`}
            description={`Show enchant level ${index}.`}
          />
        ))}
      </CardContent>
    </Card>
  )
}

function MapPage() {
  return (
    <section className="w-full max-w-5xl">
      <PageHeader
        eyebrow="Map"
        title="Map rendering stays optional."
        description="Camel Radar can run without optional map packs. If maps are installed, this toggle lets the radar canvas draw them behind live objects."
      />

      <Card>
        <CardHeader>
          <CardTitle>Background</CardTitle>
          <CardDescription>Map assets are loaded from the local images folder when available.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <SettingSwitch storageKey="settingShowMap" title="Show map background" description="Draw the current cluster map behind live radar objects." />
          <Alert>
            <Compass className="size-4" />
            <AlertTitle>Optional asset pack</AlertTitle>
            <AlertDescription>Missing map images no longer crash the UI; the radar continues with a plain canvas view.</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </section>
  )
}

function IgnoreListPage() {
  const [name, setName] = useState("")
  const [type, setType] = useState<IgnoreType>("Player")
  const [error, setError] = useState("")
  const [entries, setEntries] = useJsonSetting<IgnoreEntry[]>("ignoreList", [])

  const addEntry = () => {
    const normalized = name.trim().toUpperCase()
    if (!normalized) {
      setError("Enter a player, guild, or alliance name before adding it.")
      return
    }

    if (entries.some((entry) => entry.Name === normalized && entry.Type === type)) {
      setError("That entry is already in the ignore list.")
      return
    }

    setEntries([...entries, { Name: normalized, Type: type }])
    setName("")
    setError("")
  }

  const removeEntry = (index: number) => {
    setEntries(entries.filter((_, entryIndex) => entryIndex !== index))
  }

  return (
    <section className="w-full max-w-6xl">
      <PageHeader
        eyebrow="Ignore list"
        title="Keep known names out of alerts."
        description="Entries are stored locally and read directly by the radar renderer."
      />

      <Card>
        <CardHeader>
          <CardTitle>Add entry</CardTitle>
          <CardDescription>Names are normalized to uppercase to match incoming packet labels.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-[1fr_12rem_auto_auto]">
            <div className="grid gap-2">
              <Label htmlFor="ignore-name">Name</Label>
              <Input id="ignore-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="PLAYER_OR_GUILD" />
            </div>
            <div className="grid gap-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(value) => setType(value as IgnoreType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Player">Player</SelectItem>
                  <SelectItem value="Guild">Guild</SelectItem>
                  <SelectItem value="Alliance">Alliance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button className="w-full" onClick={addEntry}>
                Add entry
                <ChevronRight />
              </Button>
            </div>
            <div className="flex items-end">
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="w-full" variant="outline" disabled={entries.length === 0}>
                    <RotateCcw />
                    Reset
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Reset ignore list?</DialogTitle>
                    <DialogDescription>This clears every local ignore entry.</DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <DialogClose asChild>
                      <Button variant="destructive" onClick={() => setEntries([])}>
                        Clear all
                      </Button>
                    </DialogClose>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {error ? (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertTitle>Entry not added</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3}>
                    <Alert>
                      <Eye className="size-4" />
                      <AlertTitle>No ignored names</AlertTitle>
                      <AlertDescription>Player, guild, and alliance detections are currently unfiltered.</AlertDescription>
                    </Alert>
                  </TableCell>
                </TableRow>
              ) : (
                entries.map((entry, index) => (
                  <TableRow key={`${entry.Type}-${entry.Name}-${index}`}>
                    <TableCell className="font-medium">{entry.Name}</TableCell>
                    <TableCell>
                      <span className="text-sm font-semibold text-primary">{entry.Type}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" aria-label={`Remove ${entry.Name}`} onClick={() => removeEntry(index)}>
                        <Trash2 />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  )
}

function NotFoundPage({ path, navigate }: { path: string; navigate: (path: string) => void }) {
  return (
    <section className="w-full max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Page not found</CardTitle>
          <CardDescription>The local route does not exist in Camel Radar.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Alert variant="destructive">
            <XCircle className="size-4" />
            <AlertTitle>Missing route</AlertTitle>
            <AlertDescription>{path}</AlertDescription>
          </Alert>
          <Button className="w-fit" onClick={() => navigate("/home")}>
            Back to controls
          </Button>
        </CardContent>
      </Card>
    </section>
  )
}

function RadarWindow() {
  const { status, error } = useLegacyRadarModule("radar")

  return (
    <ToolSurface
      title="Camel Radar"
      description="Live local canvas"
      status={status}
      error={error}
      actions={
        <>
          <Button id="button" variant="outline">
            Clear
          </Button>
          <Button variant="outline" onClick={() => console.table(window.camelRadarDebug?.getState?.())}>
            Log state
          </Button>
          <Button onClick={() => openTool("/items", "CamelItemsWindow")}>
            <PackageSearch />
            Items
          </Button>
        </>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[520px_minmax(260px,1fr)]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Radar canvas</CardTitle>
            <CardDescription>500 x 500 live overlay stack</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative size-[500px] max-w-full overflow-hidden rounded-lg border bg-zinc-950">
              <canvas className="absolute inset-0" id="mapCanvas" width="500" height="500" />
              <canvas className="absolute inset-0" id="gridCanvas" width="500" height="500" />
              <canvas className="absolute inset-0" id="drawCanvas" width="500" height="500" />
              <canvas className="absolute inset-0" id="flashCanvas" width="500" height="500" />
              <canvas className="absolute inset-0" id="ourPlayerCanvas" width="500" height="500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Detected items</CardTitle>
            <CardDescription>Player equipment stream</CardDescription>
          </CardHeader>
          <CardContent>
            <canvas id="thirdCanvas" width="500" height="500" className="h-[500px] w-full rounded-lg border bg-zinc-950" />
          </CardContent>
        </Card>
      </div>
      <p id="connectionStatus" data-state="loading" className="sr-only">
        Loading
      </p>
      <p id="radarError" className="sr-only" hidden />
    </ToolSurface>
  )
}

function ItemsWindow() {
  const { status, error } = useLegacyRadarModule("items")

  return (
    <ToolSurface title="Camel Items" description="Detected player equipment" status={status} error={error}>
      <Card>
        <CardHeader>
          <CardTitle>Items canvas</CardTitle>
          <CardDescription>Equipment appears here when player packets include item data.</CardDescription>
        </CardHeader>
        <CardContent>
          <canvas id="thirdCanvas" width="500" height="500" className="h-[500px] w-full rounded-lg border bg-zinc-950" />
        </CardContent>
      </Card>
      <p id="itemsStatus" data-state="loading" className="sr-only">
        Loading
      </p>
      <p id="itemsError" className="sr-only" hidden />
    </ToolSurface>
  )
}

function ToolSurface({
  title,
  description,
  status,
  error,
  actions,
  children,
}: {
  title: string
  description: string
  status: string
  error?: string
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="min-h-dvh bg-[radial-gradient(circle_at_12%_0%,rgba(237,182,70,0.14),transparent_28rem),linear-gradient(145deg,#0f150f_0%,#090d0a_58%,#11100b_100%)] p-4 text-foreground lg:p-6">
      <div className="mx-auto grid max-w-7xl gap-4">
        <Card>
          <CardHeader className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div className="flex items-center gap-3">
              <img src="/images/camel-logo.png" alt="Camel Radar logo" className="h-[4.75rem] w-[4.75rem] shrink-0 object-contain" />
              <div>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">{actions}</div>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Alert variant={error ? "destructive" : "default"}>
              {error ? <Bug className="size-4" /> : <Radar className="size-4" />}
              <AlertTitle>{error ? "Runtime issue" : "Runtime status"}</AlertTitle>
              <AlertDescription>{error || status}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
        {children}
      </div>
    </div>
  )
}

function useLegacyRadarModule(kind: "radar" | "items") {
  const [status, setStatus] = useState("Preparing legacy renderer")
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        setStatus("Loading browser runtime")
        await loadScript("/camel-radar-config.js").catch(() => undefined)

        if (kind === "radar") {
          await loadScripts([
            "/scripts/Handlers/HarvestablesHandler.js",
            "/scripts/Handlers/MobsHandler.js",
            "/scripts/Handlers/ChestsHandler.js",
            "/scripts/Handlers/DungeonsHandler.js",
            "/scripts/Handlers/Map.js",
            "/scripts/Handlers/MobsInfo.js",
            "/scripts/Handlers/ItemsInfo.js",
            "/scripts/Handlers/FactionFlagInfo.js",
            "/scripts/Utils/DrawingUtils.js",
          ])
          await importLegacyModule("/scripts/Utils/Utils.js")
        } else {
          await loadScripts(["/scripts/Handlers/ItemsInfo.js"])
          await importLegacyModule("/scripts/Utils/ItemsPage.js")
        }

        if (!cancelled) setStatus("Renderer loaded. Waiting for WebSocket stream.")
      } catch (moduleError) {
        console.error("[camel] Could not load renderer:", moduleError)
        if (!cancelled) setError(moduleError instanceof Error ? moduleError.message : "Renderer failed to load")
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [kind])

  return { status, error }
}

function loadScripts(sources: string[]) {
  return sources.reduce((promise, source) => promise.then(() => loadScript(source)), Promise.resolve())
}

function importLegacyModule(source: string) {
  return import(/* @vite-ignore */ source)
}

function loadScript(source: string) {
  window.__camelLoadedScripts = window.__camelLoadedScripts ?? new Set<string>()
  const existing = document.querySelector<HTMLScriptElement>(`script[data-camel-source="${source}"]`)

  if (window.__camelLoadedScripts.has(source) || existing?.dataset.loaded === "true") {
    return Promise.resolve()
  }

  return new Promise<void>((resolve, reject) => {
    const script = existing ?? document.createElement("script")
    script.src = source
    script.async = false
    script.dataset.camelSource = source
    script.addEventListener(
      "load",
      () => {
        script.dataset.loaded = "true"
        window.__camelLoadedScripts?.add(source)
        resolve()
      },
      { once: true },
    )
    script.addEventListener("error", () => reject(new Error(`Failed to load ${source}`)), { once: true })

    if (!existing) document.head.appendChild(script)
  })
}

declare global {
  interface Window {
    camelRadarDebug?: {
      getState?: () => unknown
    }
    __camelLoadedScripts?: Set<string>
  }
}

export default App
