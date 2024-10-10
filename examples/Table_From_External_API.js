import { Client } from "@notionhq/client";
import { createNotion, appendBlocks } from "notion-helper";
import ky from "ky";

const secret = "YOUR_INTEGRATION_KEY"

const notion = new Client({
    auth: secret,
});

const page_id = "YOUR_TARGET_PAGE"

const response = await appendBlocks({
    block_id: page_id,
    children: createNotion({ limitChildren: false })
        .table({
            has_column_header: true,
            rows: [["Name", "HP", "ATK", "DEF"]],
        })
        .loop(
            (pokemon, data) => {
                pokemon.tableRow([
                    data.name,
                    data.stats[0].base_stat,
                    data.stats[1].base_stat,
                    data.stats[2].base_stat,
                ]);
            },
            await Promise.all(
                Array.from({ length: 10 }, (_, i) => {
                    return ky
                        .get(`https://pokeapi.co/api/v2/pokemon/${i + 1}`)
                        .json();
                })
            )
        )
        .endTable()
        .build()
        .content,
    client: notion,
});

console.log(response)