# lockbuilder.io
https://lockbuilder.io

A tool to build and share challenge lock designs, simulate picking, and more!
![download (1)](https://github.com/chestnutzero/pin-planner/assets/1626151/e1a582c8-35f3-4894-8d06-3f7538d2270a)

## Overview
`lockbuilder.io` is a simple frontend-only tool to create **long-lived sharedable urls** that point to visualizations of nearly any standard pin-tumbler pinning configuration you can think of.

## This is cool, but I want the real thing!
Awesome! The locksport community is super welcoming, and the more people excited about locks the better.

To get started playing with real locks (only locks you own and pick for fun, not locks in use!!), you can check out the [wiki](https://www.reddit.com/r/lockpicking/wiki/generalwiki) on /r/lockpicking, and join the [Lockpickers' Union discord](https://discord.gg/lockpicking).

## Why build this?
I built this tool mainly as a way to visualize and plan challenge lock designs after watching the [tutorial by LanSpyKey](https://www.youtube.com/watch?v=ZNUldy4_GG0).
But it pretty quickly turned into something that I just found fun to play with, so I kept building on it and adding features!

Now, the main reason I want to put this tool out there is to give people a way to _share_ their custom lock and pin ideas.
Often, when discussing pin designs or challenge lock ideas, it can be hard to describe in words what you want to accomplish.
My hope is that this tool will provide a way for people to turn their idea into a visual and share it with others.

## Key features
### Lay out a lock's pinning
You can add chambers and pins to your hearts content, and fully customize each pin, as well as select from a couple supported countermilling options for the chambers.
There's a library of common pin types that can be easily added and used as-is, or as a starting point for creating custom pin designs.

There's built-in support for all the ASSA classics like gins, christmas trees, and barrels, and new pin types are easy to create and simple to add.

### Create custom pin designs
`lockbuilder.io` features a click-and-drag polygon editor for creating custom pin designs!
The points on a pin can be customized to lock their position relative to the top, middle, or bottom, 
so you can specify which parts you want to stretch/squish and which you want to keep the same when changing the pin height later on.
<img width="601" alt="Screen Shot 2023-10-29 at 1 22 19 AM" src="https://github.com/chestnutzero/pin-planner/assets/1626151/3ccbfe95-8e03-4e0d-a622-116e6314c005">

### Share your lock pinning plan
The pinning shown in the tool is encoded into the URL and updated automatically as you make changes.
You can play with the pinning used in the gifs in this readme [here](https://lockbuilder.io/?c=%5B%27IAk4xc9GgZ9xd9v~IAk5xsr7GtUV-J3086%5fV4%5fOJOJ8Vq%5fzP6lDDT335DDazK8VqKOaOaV4K3086K1V-E6B7%29NC.1--PFQJQLQE9FQE9B6%29GgUu3-J5517E0741q548E0741Fl05fl51f7245J7261J7894P343F794fXJXJ9005P412yP43w9514J94uL94uT5lF9514T588yK9005KXjXTl7F794K7894K7261j7245jl51E9259Fl05E9259q548K5517K1u3-E6B6%29NC--JRPwRPwSJSLSTwSTwRKR%2a1B7%29GbZ7xs7v%5D%2aW%5B-%2C0A%5C%27B--%5DWMApinHeightMYCA%28MApointsMY%5B%5B0D%2C1E%2a0.F-.GAWAmYAI%28ApY%5BJ%2a0FK%2a1FL%2a0DD%2a1DDKM%5C%5Cx%2COu43qPE1Q6667DR0286-S9714DTE8UA%29%27~IC.4--J1V571W%5D%2CX8449Y%5C%21ZA%29%27~%5BAk%5fP801FaT199FfP366FjT634Fl65qF5u83vA%5D%27w5FxNAyF9035z8857q%01zyxwvuqljfa%5fZYXWVUTSRQPONMLKJIGFEDCBA-%2a%5f)

#### Note on the urls
Yeah, these urls can get looong. Like a full paragraph of gibberish.
I use [JSONCrush](https://github.com/KilledByAPixel/JSONCrush) to compress the pin data but there's still a lot of info to store there.
That's just how it's gotta be, although if someone wants to come up with and implement a more efficient compression scheme, PRs are welcoem 😁

### Simulate picking
<img width="848" alt="Screen Shot 2023-11-06 at 8 21 03 AM" src="https://github.com/chestnutzero/pin-planner/assets/1626151/347d9e5c-85d4-4d77-9841-b3d259e714f1">

![spool](https://github.com/chestnutzero/pin-planner/assets/1626151/b69eaa87-0e5a-480f-8300-c50083fed54b)]
![overset-trap2](https://github.com/chestnutzero/pin-planner/assets/1626151/102619e1-e7bd-4d66-9198-5a48f54428ef)

You can simulate  picking the entire lock at once with the `Simulate picking!` button.
This uses a 2d physics engine called [matter.js](https://brm.io/matter-js/) to simulate the movement of all the lock components.
This allows simulating the picking of any pin you can dream up, even if it's not physically possible to create in the real world.

#### Click-and-drag controls
You can click and drag keypins to simulate pushing on them with a pick. 
You can also drag driver pins and the core directly, if you want to mess around with the lock in ways that aren't possible when actually picking 🙂

#### Keyboard-based tension control
Hold `a` and/or `s` to manually counter-rotate (tip: hold both to counter-rotate more).
If you're having trouble getting the lip of a spool over the shear line, this is most likely what you need to do.

Hold `d` and/or `f` to increase tension strength.
If you're having trouble getting a pin to set, this is most likely what you need to do.

#### Float picking
![floatpicking](https://github.com/chestnutzero/pin-planner/assets/1626151/ae692cc5-2857-499f-bdf2-7ac20a0e393e)

Float picking works kinda like that helicopter game where you fly through a tunnel and tap a button to keep the helicopter at a steady height.
By holding `a` and _carefully_ tapping `s`, you can manually counter-rotate the core to try and hold it add a specific level of rotation.
This is usually needed, for example, to set a gin spool whose head gets trapped in gin-style countermilling.

This is a very advanced technique in real-life lockpicking which takes a long time to perfect, and it's very difficult in the simulator as well,
so don't worry if you can't nail it at first. Start on a lower difficulty level, which has more forgiving tolerances, until you get a feel for it.


#### Chamber milling support
When adding a chamber or when you have a chamber selected, you can choose the chamber milling type from a couple different supported options
 - None
 - Gin-style countermilling
 - Barrel-style serrations
 - Overmilling
 - Challenge-lock-style fully threaded chamber
Just like in real lockpicking, adding countermilling to a chamber increases difficulty by a lot, and often makes it a lot easier for pins to feel "stuck".

#### Single-chamber isolation

When a pin or chamber is selected, you can hit the `Simulate chamber!` button to simulate picking just the selected chamber.

#### A note on realism and physics bugs
The physics engine used here is pretty minimal, and the controls aren't perfect, so there's always going to be some funkiness in the simulator.

Rather than try super hard to keep people from doing things that could break the engine,
I've generally opted to give people as much freedom as possible to do whatever they want in this tool, even if it breaks things.

### Immortal URLs, extremely reliable uptime
Lastly, because all the pin data is encoded in the URL, I didn't need to build or run a dedicated backend for this app.
As long as github pages keeps hosting the html and js files, it'll keep working

This means there are zero maintenance costs, and things can only go down if github pages itself goes down.

I'll never (intentionally) make breaking changes to the serialization format, so any generated URL will work forever - 
no risk of clicking an old URL and finding that the data it points to has been deleted.

The URL _is_ the data.

# Contribution guidelines
## Adding premade pin types
If you've created a pin type that you think should be added to the built-in pin types available in `pin-planner`, export the pin definition by selecting it in the app and hitting the `Export pin` button,
and shoot me a message on discord at `chestnut0`.

## Code contributions
There isn't any system for making code contributions to this project, for now I'd ask that you reach out to me on discord at `chestnut0` if you want to get involved in development.
