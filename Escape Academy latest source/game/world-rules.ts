import type { Theme } from "@/lib/plan";

export const worlds = {
  space: {
    chambers:["Life Support","Docking Ring","Navigation Deck","Escape Airlock"],
    meter:"Oxygen", equipment:"Oxygen reserve", action:"Open the reserve valve", effect:"30 seconds of oxygen added",
    warning:"Oxygen falls as the clock counts down. A reserve canister can add 30 seconds once per chamber.",
    expired:"Oxygen depleted", reason:"The life support system ran out of oxygen. You've passed out due to lack of oxygen.",
  },
  ocean: {
    chambers:["Observation Dome","Pump Junction","Pressure Gallery","Ascent Lock"],
    meter:"Flood clock", equipment:"Bilge pump", action:"Prime the pump", effect:"Floodwater pumped down",
    warning:"Water rises from the floor as time passes. The bilge pump can push it back by 30 seconds once per chamber.",
    expired:"Lab submerged", reason:"Floodwater rose above your head before you reached the hatch. You've passed out underwater.",
  },
  alien: {
    chambers:["Specimen Wing","Quarantine Vault","Echo Junction","Containment Gate"],
    meter:"Containment", equipment:"Echo beacon", action:"Send a decoy signal", effect:"Decoy holding the creature for 12 seconds",
    warning:"A creature pursues you as soon as you enter. The echo beacon stops it for 12 seconds. When containment runs out, more creatures breach the walls.",
    expired:"Containment lost", reason:"The chamber sealed when the containment clock ran out.",
  },
  city: {
    chambers:["Transit Concourse","Signal Exchange","Service Gallery","Elevator Relay"],
    meter:"Grid clock", equipment:"Backup inverter", action:"Switch to backup lighting", effect:"Backup lighting restored for 24 seconds",
    warning:"The lights dim as the grid runs down and flicker near the end. The backup inverter restores steady lighting for 24 seconds.",
    expired:"Grid offline", reason:"The city grid disconnected this chamber.",
  },
  lab: {
    chambers:["Sample Intake","Reactor Annex","Analysis Ring","Decontamination Lock"],
    meter:"Cooling clock", equipment:"Coolant bypass", action:"Open the coolant bypass", effect:"Cooling restored for 24 seconds",
    warning:"The hot floor around the reactor slows movement. The coolant bypass cools it for 24 seconds.",
    expired:"Cooling failed", reason:"The lab sealed to protect the equipment. You've passed out due to heat.",
  },
  greenhouse: {
    chambers:["Propagation Wing","Canopy Ring","Irrigation Junction","Vent Gate"],
    meter:"Vent clock", equipment:"Extraction fan", action:"Vent the mist", effect:"Observation aisles clear for 24 seconds",
    warning:"Condensation thickens near the plants as the clock runs down. The extraction fan clears the air for 24 seconds.",
    expired:"Vents sealed", reason:"The conservatory’s ventilation cycle ended. The chamber is filled by toxic mist.",
  },
  archive: {
    chambers:["Reading Gallery","Catalog Annex","Relic Vault","Sealed Stacks"],
    meter:"Vault clock", equipment:"Emergency lantern", action:"Light the lantern", effect:"Emergency lights active for 24 seconds",
    warning:"The lamps dim as the vault closes. The emergency lantern restores light for 24 seconds.",
    expired:"Vault sealed", reason:"The archive’s closing cycle ended.",
  },
  tower: {
    chambers:["The Workshop","Gear Chamber","Regulator Loft","Bell Platform"],
    meter:"Winding clock", equipment:"Escapement brake", action:"Hold the pendulum", effect:"Pendulum held for 24 seconds",
    warning:"Keep clear of the swinging weight around the clock. The brake holds it for 24 seconds.",
    expired:"Clock stopped", reason:"The weight reached the end of its travel and locked the hatch.",
  },
} satisfies Record<Theme,{chambers:readonly [string,string,string,string];meter:string; equipment:string;action:string;effect:string;warning:string;expired:string;reason:string}>;

export const dangerReadouts = {
  space: {label:"Oxygen remaining", detail:"Life support is draining."},
  ocean: {label:"Water level", detail:"Floodwater rises as the clock runs down."},
  alien: {label:"Containment reserve", detail:"Keep moving when the creature approaches."},
  city: {label:"Grid reserve", detail:"The lights dim as the grid runs down."},
  lab: {label:"Coolant reserve", detail:"Heat slows you near the reactor."},
  greenhouse: {label:"Ventilation reserve", detail:"Mist thickens around the plants."},
  archive: {label:"Lamp reserve", detail:"The stacks grow darker as time runs down."},
  tower: {label:"Clock reserve", detail:"The swinging weight slows you if you get too close."},
} satisfies Record<Theme,{label:string;detail:string}>;

export function floodProgress(remaining:number) {
  return Math.pow(1-remaining,1.22);
}
