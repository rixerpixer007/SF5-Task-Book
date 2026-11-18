# Original book controls and layout

`book.png` and `beacon.png` are Minecraft Java Edition 1.20.1 GUI textures, copyright Mojang/Microsoft, obtained from the [Minecraft assets mirror](https://github.com/InventivetalentDev/minecraft-assets/tree/1.20.1/assets/minecraft/textures/gui). The book sheet contains the original paper artwork and the curved normal/hover arrows; the beacon sheet contains the green checkmark. The checkbox backing is a custom warm parchment color drawn in CSS.

Control sizes and flow rules were checked against [Checklist-Forge-1.20.1-1.3.0](https://www.curseforge.com/minecraft/mc-mods/checklist/files/5075898): `TaskBookScreen`, `ScreenUtil`, `TaskElement`, `CheckboxTaskElement`, and `CheckBoxButton`. The implementation retains our existing OFL Minecraft-style font at its natural width; the task layout reserves the full checkbox footprint. It does not ship or switch to SkyFactory's comic font.

The frame is drawn from the original atlas with transparent margins accounted for. Source formatting, explicit page breaks, and blank hidden pages come from the pinned SkyFactory task-book text in `src/data/source.json`.
