# mml-kartta

Maanmittauslaitoksen maastokartta-aineisto L0-indeksiksi, ja selainkäyttöinen
karttasovellus joka lukee sitä suoraan HTTP Range -pyynnöillä ilman palvelinta.

Koko maan aineisto on yksi 883 MB:n tiedosto: 6 683 615 kohdetta, 72 kokoelmaa.
Mikä tahansa näkymä maksaa 2–4 kierrosta ja 20–40 ms.

**Tekninen raportti: [`docs/l0-mml-tekninen-raportti.md`](docs/l0-mml-tekninen-raportti.md)**
(sama PDF:nä, jossa myös kaksi selittävää kuvaa mukana).

## Hakemistot

| | |
| --- | --- |
| `map-viz/` | karttasovellus ja yksitoista tyylitiedostoa |
| `tools/` | MML:n Shapefile-lukijat, ingest L0-dokumenteiksi, testien datageneraattori |
| `src/` | L0-indeksin ydin — **kopio** L0_idx-projektista, ks. alla |
| `test/` | L0:n testit (93 kpl) |
| `docs/` | tekninen raportti |
| `data/` | artefaktit, **ei versionhallinnassa** |

`src/` ja `test/` ovat kopioita L0-indeksin ytimestä, jotta tämä repo on
itsenäinen ja ajettava. Ne eivät ole MML-kohtaisia eivätkä seuraa alkuperäisen
muutoksia automaattisesti.

## Käyttö

```sh
npm test                      # L0:n testit, 93 kpl

node tools/ingest-mtk.js      # Shapefilet -> data/mtk-map.l0
python3 map-viz/pyserve.py . 8300   # <juuri> <portti>
# http://localhost:8300/map-viz/index.html
```

Tavallinen `python3 -m http.server` **ei kelpaa**: se vastaa Range-pyyntöön
200:lla, jolloin lukija lukisi vääriä tavuja. Se hylkää sellaisen vastauksen
tarkoituksella. `map-viz/pyserve.py` ja `map-viz/serve.js` osaavat Rangen.

## Julkaisu GitHub Pagesiin

Pages tarjoilee Range-pyynnöt oikein (mitattu: `206` + `content-range`), ja
sovellus kestää alipolun `user.github.io/<repo>/`. `.nojekyll` on repossa.

Este on tiedostokoko: **GitHub torjuu yli 100 MiB:n tiedostot** ja varoittaa yli
50 MiB:stä. Artefakti on 842,8 MB, joten se pilkotaan:

```sh
node tools/split-artifact.js data/mtk-map.l0 45   # -> 19 osaa à 45 MiB + manifesti
```

Kartta etsii ensin manifestin `data/mtk-map.l0.json` ja käyttää silloin
`ChunkedHttpTransport`ia, joka kartoittaa tavuvälit osiin. Jos manifestia ei ole,
se palaa kokonaiseen tiedostoon. Kumpikin on mitattu samaksi: 4 kierrosta,
43,36 MB. Osarajan ylittävä väli muuttuu kahdeksi pyynnöksi, mutta ne ovat
rinnakkaisia, joten kierrosmäärä ei kasva.

Osat ovat `.gitignore`n alla oletuksena. Julkaistaksesi ne on lisättävä
versionhallintaan tietoisesti:

```sh
git add -f data/mtk-map.l0.0?? data/mtk-map.l0.json
```

Harkitse ensin: repo kasvaa 843 MB:iin. Pagesin julkaistun sivuston raja on 1 GB
ja kaistaraja 100 GB/kk — yksi tiepintanäkymä on 43 MB eli noin 2 300 näkymää
kuukaudessa. Vaihtoehto on pitää artefakti erillisessä objektivarastossa; silloin
tarvitaan CORS ja nimenomaan `Access-Control-Expose-Headers: Content-Range`,
koska transport lukee kokonaispituuden siitä.

## Aineisto

MML:n maastokartta-aineisto vektorimuodossa, mittakaavat 1:100 000 ja 1:250 000,
Shapefile. Koordinaatisto EPSG:3067 (ETRS-TM35FIN), yksikkö metri.
Ladattu 8.10.2026.

**Sisältää Maanmittauslaitoksen Maastokartta 1:100 000 ja Maastokartta
1:250 000 -aineistoa 10/2026.** Tämä lähdemerkintä on CC BY 4.0:n vaatimus ja
kuuluu näkyviin myös kuvakaappauksiin ja esityksiin. Ks. [`data/LICENSE`](data/LICENSE).

## Lisenssit

| | |
| --- | --- |
| koodi (`map-viz/`, `tools/`, `src/`, `test/`) | MIT — [`LICENSE`](LICENSE) |
| kartta-aineisto (`data/`) | CC BY 4.0 — [`data/LICENSE`](data/LICENSE) |

API-avain luetaan ympäristöstä (`~/.config/mml.env`, chmod 600). Avainta ei ole
eikä tule tähän repoon.

## Kartat

Peruskartta · korkeusvyöhykkeet · luonnonsuojelukohteet · nyppyläkartta ·
suokartta (kaksi palettiversiota) · vesistökartta · paikkakartta ·
itä-länsikartta · ojakartta · tiepintakartta.

Viisi niistä on paikannimien levinneisyyskarttoja: sama maastonmuoto, eri sana
eri alueella.
