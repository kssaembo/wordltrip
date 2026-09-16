import fs from 'node:fs'
const original=await (await fetch('https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson')).json()
const p='public/data/countries.geojson';const small=JSON.parse(fs.readFileSync(p,'utf8'))
for(const f of small.features)if(!f.geometry)f.geometry=original.features.find(o=>o.properties.name===f.properties.name)?.geometry??null
fs.writeFileSync(p,JSON.stringify(small))
