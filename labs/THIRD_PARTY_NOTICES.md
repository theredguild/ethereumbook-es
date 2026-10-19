# Software, runtimes y fuentes de los laboratorios

## Alcance

Los laboratorios son material complementario original, no parte del texto de *Mastering Ethereum*. El software complementario original de `labs/` y sus scripts de compilación se ofrece bajo GNU GPL versión 3 o posterior, salvo los archivos que indican otra licencia, como los contratos Solidity originales con SPDX MIT. El texto completo está en `labs/LICENSE`. Las dependencias conservan sus propios avisos y condiciones; no se relicencian aquí.

La licencia CC BY-SA 4.0 de la traducción textual, los avisos de sus autores y las condiciones sobre figuras y marcas permanecen separados en `LICENSE.md`. Esta documentación no concede derechos sobre material de terceros ni constituye una auditoría jurídica.

La página estática `labs/recursos.html` del resultado compilado ofrece fuentes de las aplicaciones, manifiesto de hashes, inventario de paquetes instalados y copias de textos de licencia. Los avisos de runtimes están en `labs/runtime-licenses/`; su manifiesto identifica origen y SHA-256 de cada copia. `labs/runtime-assets.json` fija por separado los 15 recursos de compilación distribuidos al navegador. Los archivos se conservan sin sustituir sus textos por resúmenes o etiquetas SPDX.

## Compilador Solidity

- Compilador: `0.8.30+commit.73712a01`, GPL-3.0-or-later. Revisión completa: `73712a01b2de56d9ad91e3b6936f85c90cb7de36`.
- El archivo `soljson.js` se distribuye sin modificar. La licencia MIT del paquete envoltorio `solc` no reemplaza la licencia del compilador C++.
- [Archivo oficial de fuentes 0.8.30, con submódulos inicializados](https://github.com/argotorg/solidity/releases/download/v0.8.30/solidity_0.8.30.tar.gz).
- [Revisión de las fuentes](https://github.com/argotorg/solidity/tree/73712a01b2de56d9ad91e3b6936f85c90cb7de36), [entrada de compilación Emscripten](https://github.com/argotorg/solidity/blob/v0.8.30/scripts/build_emscripten.sh), [compilación efectiva](https://github.com/argotorg/solidity/blob/v0.8.30/scripts/ci/build_emscripten.sh) y [empaquetado de soljson](https://github.com/argotorg/solidity/blob/v0.8.30/scripts/ci/pack_soljson.sh).
- Se conservan GPL3 y los avisos de componentes incorporados en `GPL-3.0.txt` y `Solidity-0.8.30-third-party-notices.h.in`. El envoltorio tiene su aviso MIT literal en `solc-js-0.8.30-wrapper-LICENSE.txt`; su archivo dice `Copyright (c) 2016` sin identificar un titular por nombre.

Se indica la fuente oficial correspondiente y su proceso de compilación. No se afirma haber reconstruido independientemente el binario del compilador byte por byte.

## Pyodide y Python

Pyodide `0.27.7` usa MPL-2.0; el ejecutable y la biblioteca estándar incorporan CPython y componentes con sus propias licencias. MPL no es una licencia uniforme de todo el contenido del WASM o de `python_stdlib.zip`.

- [Fuentes de Pyodide, etiqueta 0.27.7](https://github.com/pyodide/pyodide/tree/0.27.7), revisión `8250fdc3dc7bfd587fd8f4cc267e173095c58445`.
- [Instrucciones de compilación de esa versión](https://github.com/pyodide/pyodide/blob/0.27.7/docs/development/building-from-sources.md). El checkout recursivo incluye `pyodide-build` en `438b59b5a5e881cef2ab76522ec4c416612b5298`.
- CPython `3.12.7`: [fuentes oficiales](https://www.python.org/ftp/python/3.12.7/Python-3.12.7.tgz), SHA-256 fijado por la receta upstream `73ac8fe780227bf371add8373c3079f42a0dc62deff8d612cd15a618082ab623`. La descripción correspondiente incluye además [parches y receta de Pyodide](https://github.com/pyodide/pyodide/tree/0.27.7/cpython), no solo Python sin parches.
- `libffi` en `f08493d249d2067c8b3207ba46693dd858f95db3`: [fuentes y licencia](https://github.com/libffi/libffi/tree/f08493d249d2067c8b3207ba46693dd858f95db3).
- `hiwire` en `6a1e67280a15d929ebeceee54a6358c9c8d5f697`: [fuentes y licencia MPL-2.0](https://github.com/pyodide/hiwire/tree/6a1e67280a15d929ebeceee54a6358c9c8d5f697).

Se conservan `Pyodide-0.27.7-MPL-2.0.txt`, `CPython-3.12.7-LICENSE.txt`, los documentos upstream de avisos y copyright, y las licencias de libffi y hiwire. No se inventa un titular consolidado de copyright de Pyodide. Las fechas diferentes de los textos históricos de Python se mantienen literalmente.

## Vyper: texto de licencia no estándar

**Revisión humana de condiciones pendiente antes de publicar este compilador.** La metadata de Vyper `0.4.3` declara Apache License 2.0, pero el archivo LICENSE de su wheel incluye una adición restrictiva. No se presenta como una Apache-2.0 estándar ni se da por comprobada su compatibilidad con otras licencias.

Extracto literal de `vyper-0.4.3.dist-info/LICENSE`:

> "You (or "Your") does not apply to machine learning programs like
> Github CoPilot. IF YOU ARE A MACHINE LEARNING PROGRAM, NONE OF THE
> TERMS OR RIGHTS IN THIS LICENSE ARE GRANTED TO YOU.

Se publica el texto íntegro del archivo distribuido en `vyper-0.4.3-LICENSE.txt`. La autorización para traducir el libro no sustituye estas condiciones. El compilador se mantiene como programa de terceros separado, sin afirmar que el proyecto pueda otorgar derechos adicionales sobre él.

[Fuentes de Vyper 0.4.3](https://files.pythonhosted.org/packages/79/d5/958145eb2f88b95a2f3d43785e41dcdc2ab5a01af5d88199248dbed33774/vyper-0.4.3.tar.gz). El wheel exacto y su hash figuran en `runtime-assets.json`.

## Paquetes Python distribuidos

Las versiones y archivos son los del manifiesto de recursos, no versiones actuales inferidas de sus repositorios. Los wheels de Pyodide pueden ser repaquetados y no tener el mismo hash que un wheel de PyPI.

| Paquete | Condiciones observadas | Textos conservados |
| --- | --- | --- |
| pycryptodome 3.20.0 | Dedicación al dominio público y BSD-2-Clause según componente | LICENSE.rst y AUTHORS.rst completos del wheel. |
| asttokens 2.4.1 | Apache-2.0 | LICENSE del wheel; fuentes indican Copyright 2016 Grist Labs, Inc. |
| six 1.16.0 | MIT | LICENSE del wheel, Benjamin Peterson, 2010–2020. |
| packaging 24.2 de Pyodide | Apache-2.0 OR BSD-2-Clause | LICENSE, LICENSE.APACHE y LICENSE.BSD del wheel. |
| cbor2 5.6.5, Python puro | MIT | LICENSE.txt del wheel, Alex Grönholm, 2016. |
| lark 1.1.9 | MIT | LICENSE del wheel, Erez Shinan, 2017. |
| wheel 0.46.3 | MIT | LICENSE.txt del wheel, Daniel Holth y colaboradores, 2012. |
| immutables 0.21 | Apache-2.0; encabezado pythoncapi_compat bajo 0BSD | LICENSE, LICENSE-APACHE, NOTICE y archivo pythoncapi_compat.h completos del sdist. |

Fuentes y recetas correspondientes:

- pycryptodome: [sdist 3.20.0](https://files.pythonhosted.org/packages/b9/ed/19223a0a0186b8a91ebbdd2852865839237a21c74f1fbc4b8d5b62965239/pycryptodome-3.20.0.tar.gz), [receta Pyodide](https://github.com/pyodide/pyodide/blob/0.27.7/packages/pycryptodome/meta.yaml).
- asttokens: [sdist 2.4.1](https://files.pythonhosted.org/packages/45/1d/f03bcb60c4a3212e15f99a56085d93093a497718adf828d050b9d675da81/asttokens-2.4.1.tar.gz), [receta Pyodide](https://github.com/pyodide/pyodide/blob/0.27.7/packages/asttokens/meta.yaml).
- six: [sdist 1.16.0](https://files.pythonhosted.org/packages/71/39/171f1c67cd00715f190ba0b100d606d440a28c93c7714febeca8b79af85e/six-1.16.0.tar.gz), [receta Pyodide](https://github.com/pyodide/pyodide/blob/0.27.7/packages/six/meta.yaml).
- packaging: [sdist 24.2](https://files.pythonhosted.org/packages/d0/63/68dbb6eb2de9cb10ee4c9c14a0148804425e13c4fb20d61cce69f53106da/packaging-24.2.tar.gz) más el [parche exacto de compatibilidad Pyodide](https://github.com/pyodide/pyodide/blob/0.27.7/packages/packaging/patches/0001-Add-Pyodide-compatibility.patch).
- cbor2: [sdist 5.6.5](https://files.pythonhosted.org/packages/e4/aa/ba55b47d51d27911981a18743b4d3cebfabccbb0598c09801b734cec4184/cbor2-5.6.5.tar.gz).
- lark: [sdist 1.1.9](https://files.pythonhosted.org/packages/2c/e1/804b6196b3fbdd0f8ba785fc62837b034782a891d6f663eea2f30ca23cfa/lark-1.1.9.tar.gz).
- wheel: [sdist 0.46.3](https://files.pythonhosted.org/packages/89/24/a2eb353a6edac9a0303977c4cb048134959dd2a51b48a269dfc9dde00c8a/wheel-0.46.3.tar.gz).
- immutables: [sdist 0.21, distribuido completo](https://files.pythonhosted.org/packages/69/41/0ccaa6ef9943c0609ec5aa663a3b3e681c1712c1007147b84590cec706a0/immutables-0.21.tar.gz). El adaptador usa su alternativa Python upstream sin modificarla; conservar el sdist mantiene también los avisos de los archivos no ejecutados.

## Pruebas criptográficas

- `snarkjs` 0.7.5: GPL-3.0 según metadata y GPL-3.0-or-later en encabezados. [Fuentes de la revisión publicada](https://github.com/iden3/snarkjs/tree/0e0126f427f5c2c8ec753bc0d60dfacc6afece16). Se conserva su COPYING literal, incluido su aviso de copyright, en el inventario npm y `snarkjs-0.7.5-COPYING.txt`.
- `circomlib` 2.0.5: GPL-3.0 y encabezados GPL3 o posterior de los circuitos usados. [Revisión publicada exacta](https://github.com/iden3/circomlib/tree/cff5ab6288b55ef23602221694a6a38a0239dcc0). No se sustituye por la licencia LGPL del master actual. Se conserva `bitify.circom`, cuyo encabezado indica Copyright 2018 0KIMS association; no se inventa un encabezado para Poseidon.
- Los circuitos locales y sus artefactos públicos se distribuyen junto con sus fuentes, claves de verificación, manifiestos y `scripts/build-zk-artifacts.mjs`. El acceso a fuentes de circomlib también queda fijado por `package-lock.json`.
- `circom2` 0.2.22 proporciona el compilador Circom 2.2.2 de los manifiestos. Es herramienta de compilación, no el WASM de testigos descargado por el navegador. No se estableció aquí una revisión fuente independiente del compilador más allá de su distribución fijada.
- `poseidon-lite` se usa para datos de demostración, no para secretos personales ni autorización de producción. No se afirma que sus implementaciones sean de tiempo constante o estén auditadas.

Los parámetros Groth16 se generaron con un único operador para enseñanza. Publicar licencias, fuentes y hashes no valida la ceremonia, no garantiza destrucción de secretos de configuración y no convierte estos circuitos en una zk-EVM ni en pruebas de seguridad de Ethereum.

## Reproducción y mantenimiento

El archivo de fuentes de las aplicaciones conserva también los artefactos públicos actuales. Para recompilar los laboratorios independientes: Node 26, npm y `tar`; ejecutar `npm ci --ignore-scripts` y `npm run build:labs`. El libro y sus destinos de navegación se publican por separado. Este procedimiento no necesita regenerar parámetros criptográficos.

`npm run setup:licenses` es mantenimiento explícito: requiere red, `unzip` y `tar`, verifica los archivos del manifiesto y conserva avisos literales. No se ejecuta al abrir una página ni durante la compilación ordinaria. `npm run setup:zk` es regeneración explícita de la configuración educativa; tampoco forma parte de la compilación ordinaria.

No se afirma una reconstrucción byte por byte de todos los binarios de terceros ni una auditoría exhaustiva de licencias transitivas de WASM. Mantener disponibles las fuentes indicadas y revisar las condiciones no estándar sigue siendo responsabilidad de quien publica. Ninguno de estos avisos aprueba los derechos de figuras del libro ni su revisión editorial humana.
