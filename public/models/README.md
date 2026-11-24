# Aset Model 3D Eksternal (.glb)

Letakkan file `.glb` bertekstur PBR di folder ini dengan nama berikut agar otomatis dimuat
menggantikan model prosedural bawaan:

| Pesawat | Nama file |
| --- | --- |
| F-16 Fighting Falcon | `f16_ts1601.glb` |
| Sukhoi Su-30MK2 | `su30_mk2.glb` |
| Dassault Rafale | `rafale_tniau.glb` |
| C-130J Super Hercules | `c130j_hercules.glb` |
| Boeing 737-400 VIP | `boeing_737_vip.glb` |
| KAI T-50i Golden Eagle | `t50i_golden_eagle.glb` |
| KT-1B Woongbi | `kt1b_woongbi.glb` |
| H225M Caracal | `h225m_caracal.glb` |

Catatan:
- Model otomatis dinormalisasi (auto-center, auto-scale ±14 unit, didudukkan di y = 0).
- Orientasi ideal: hidung pesawat menghadap sumbu **+Z**, atas = **+Y** (agar pin hotspot sesuai).
- Kompresi DRACO dan Meshopt didukung.
- Bila file tidak ada, aplikasi memakai model prosedural bertekstur kamuflase TNI AU.
