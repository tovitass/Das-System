// parliament drawer code
var parliament = d3.parliament();
parliament.width(500).height(500).innerRadiusCoef(0.4);
parliament.enter.fromCenter(true).smallToBig(true);
parliament.exit.toCenter(false).bigToSmall(true);

data = [
    {
        "id": "afd",
        "legend": "AfD",
        "name": "AfD",
        "seats": 17,
        "color": "#3f7bc1"
    },
    {
        "id": "spd",
        "legend": "SPD",
        "name": "SPD",
        "seats": 29,
        "color": "#E3000F"
    },
    {
        "id": "greens",
        "legend": "Greens",
        "name": "Greens",
        "seats": 11,
        "color": "#2E8B57"
    },
    {
        "id": "cdu",
        "legend": "CDU + CSU",
        "name": "CDU + CSU",
        "seats": 22,
        "color": "#000"
    },
    {
        "id": "fdp",
        "legend": "FDP",
        "name": "FDP",
        "seats": 10,
        "color": "#D5AC27"
    },
    {
        "id": "linke",
        "legend": "Linke",
        "name": "Linke",
        "seats": 9,
        "color": "#D97DB1"
    },
    {
        "id": "other",
        "legend": "Other",
        "name": "Other",
        "seats": 6,
        "color": "#a0a0a0"
    }
];
d3.select("svg").datum(data).call(parliament);
