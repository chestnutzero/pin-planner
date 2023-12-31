const data = {
    "KeyPin": {
        "serializationPrefix": "k",
        "points": [
            [0.4, 0, 0],
            [0, 0.22, 0], 
            [0, 1, 1]
        ],
        "pinHeight": 5,
        "mirror": true,
        "displayName": "Key pin"
    },
    "StandardDriver": {
        "serializationPrefix": "d",
        "points": [
            [0, 0, 0],
            [0, 1, 1]
        ],
        "pinHeight": 5,
        "mirror": true,
        "displayName": "Standard driver"
    },
    "Spool": {
        "serializationPrefix": "s",
        "points": [
            [0, 0, 0],
            [0, 0.1, 0],
            [0.15, 0.1, 0],
            [0.15, 0.9, 1],
            [0, 0.9, 1],
            [0, 1, 1]
        ],
        "pinHeight": 5,
        "mirror": true,
        "displayName": "Spool"
    },
    "Mushroom": {
        "serializationPrefix": "m",
        "points":[[0,0,0],[0,0.1,0],[0.15,0.1,0],[0,0.9,1],[0,1,1],[1,1,1],[1,0.9,1],[0.85,0.1,0],[1,0.1,0],[1,0,0]],
        "pinHeight":5,
        "displayName": "Mushroom"
    },
    "TPin": {
        "serializationPrefix": "tt",
        "points":[[0.2,0,0],[0.2,0.6,1],[0,0.6,1],[0,1,1],[1,1,1],[1,0.6,1],[0.8,0.6,1],[0.8,0,0]],
        "pinHeight":5,
        "displayName": "T-pin"
    },
    "Barrel": {
        "serializationPrefix": "b",
        "points":[[0,0,0],[0,0.0333,0],[0.05,0.0333,0],[0.05,0.1667,0],[0.005,0.1667,0],[0,0.5],[0.005,0.8333,1],[0.05,0.8333,1],[0.05,0.9667,1],[0,0.9667,1],[0,1,1],[1,1,1],[1,0.9667,1],[0.95,0.9667,1],[0.95,0.8333,1],[0.995,0.8333,1],[1,0.5],[0.995,0.1667,0],[0.95,0.1667,0],[0.95,0.0333,0],[1,0.0333,0],[1,0,0]],
        "pinHeight":6,
        "displayName": "Barrel spool"
    },
    "Gin": {
        "serializationPrefix": "g",
        "points":[
            [0.1,0,0],
            [0.1,0.1,0],
            [0.2,0.1,0],
            [0.2,0.24,0],
            [0.1,0.24,0],
            [0,0.3,0],
            [0,1,1]
        ],
        "mirror": true,
        "pinHeight":5,
        "displayName": "Gin spool"
    },
    "ChristmasTree": {
        "serializationPrefix": "c",
        "points":[[0.1,0,0],[0.1,0.0833,0],[0.2,0.0833,0],[0.2,0.1667,0.5],[0.04,0.2,0.5],[0,0.2167,0.5],[0,0.25,0.5],[0.04,0.2667,0.5],[0.2,0.2667,0.5],[0.2,0.5833,0.5],[0.04,0.5833,0.5],[0,0.625,0.5],[0,1,1],[1,1,1],[1,0.625,0.5],[0.96,0.5833,0.5],[0.8,0.5833,0.5],[0.8,0.2667,0.5],[0.96,0.2667,0.5],[1,0.25,0.5],[1,0.2167,0.5],[0.96,0.2,0.5],[0.8,0.1667,0.5],[0.8,0.0833,0],[0.9,0.0833,0],[0.9,0,0]],
        "pinHeight": 6,
        "displayName": "Christmas tree"
    },
    "Tapered": {
        "serializationPrefix": "t",
        "points":[[0.05,0,0],[0,0.2,0],[0,0.8,1],[0.05,1,1],[0.95,1,1],[1,0.8,1],[1,0.2,0],[0.95,0,0]],
        "pinHeight":5,
        "displayName": "Tapered"
    },
    "Torpedo": {
        "serializationPrefix": "tp",
        "points":[[0.4,0,0],[0,0.1833,0],[0,0.5833,0.5],[0.15,0.875,1],[0.15,0.9167,1],[0,0.9167,1],[0,1,1],[1,1,1],[1,0.9167,1],[0.85,0.9167,1],[0.85,0.875,1],[1,0.5833,0.5],[1,0.1833,0],[0.6,0,0]],
        "pinHeight":6,
        "displayName": "Torpedo key pin"
    },
    "Trampoline": {
        "serializationPrefix": "tm",
        "points":[[0,0,0],[0,0.1,0],[0.15,0.1,0],[0,0.5],[0.15,0.9,1],[0,0.9,1],[0,1,1],[1,1,1],[1,0.9,1],[0.85,0.9,1],[1,0.5],[0.85,0.1,0],[1,0.1,0],[1,0,0]],
        "pinHeight":5,
        "displayName": "Trampoline spool"
    },
    "Serrated": {
        "serializationPrefix": "sr",
        "points":[[0,0,0],[0,0.06,0],[0.1,0.06,0],[0.1,0.12,0],[0,0.12,0],[0,0.18,0],[0.1,0.18,0],[0.1,0.24,0],[0,0.24,0],[0,0.3,0],[0.1,0.3,0],[0.1,0.36,0],[0,0.36,0],[0,1,1],[1,1,1],[1,0.36,0],[0.9,0.36,0],[0.9,0.3,0],[1,0.3,0],[1,0.24,0],[0.9,0.24,0],[0.9,0.18,0],[1,0.18,0],[1,0.12,0],[0.9,0.12,0],[0.9,0.06,0],[1,0.06,0],[1,0,0]],
        "pinHeight":5,
        "displayName": "Serrated"
    }
}

export default Object.fromEntries(Object.entries(data)
    .map(entry => {
        const value = entry[1];
        value.pinTypeOptionValue = entry[0];
        return [entry[0], value];
    })
);