#!/usr/bin/env python3
"""批次將 QET-Lib 元件轉為 md/images/qet-*.svg(60617 手冊速查表用)。"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from elmt2svg import convert

LIB = os.path.expanduser('~/Documents/claudeCodeDev/QET-Lib/elements-company/schematic_multiline')
OFFICIAL = os.path.expanduser('~/Documents/claudeCodeDev/QET/elements/10_electric')  # QET 官方元件庫
OUT = os.path.join(os.path.dirname(__file__), '..', 'md', 'images')

# slug -> QET-Lib 相對路徑
ELEMENTS = {
    # 2.2 接點基本形
    'contact-no': 'C_relay_control/16_relay_contact/繼電器，常開接點.elmt',
    'contact-nc': 'C_relay_control/16_relay_contact/繼電器，常閉接點.elmt',
    'contact-co': 'C_relay_control/16_relay_contact/繼電器 C 類型接點.elmt',
    # 3.1 導線連接與接地
    'terminal': 'F_terminal_connect/08_terminal_earth/borne_3.elmt',
    'earth': 'F_terminal_connect/08_terminal_earth/terre.elmt',
    'socket': 'G_electronic_misc/28_misc/插座.elmt',
    # 3.2 開關
    'pushbutton-no': 'A_switch_operate/03_buttons/poussoir.elmt',
    'pushbutton-nc': 'A_switch_operate/03_buttons/poussoir_nf.elmt',
    'estop': 'A_switch_operate/03_buttons/arret_urgence_verrou.elmt',
    'limit-switch': 'A_switch_operate/23_limit_switch/極限開關，常閉接點，保持.elmt',
    'selector-2pos': 'A_switch_operate/12_selector_switch/二段保持，常開接點.elmt',
    'disconnector': 'A_switch_operate/15_disconnect/隔離開關.elmt',
    # 3.3 保護器件
    'fuse': 'B_protect_power/14_fuse_breaker_xfmr/熔絲.elmt',
    'breaker-1p': 'A_switch_operate/15_disconnect/單極斷路器.elmt',
    'breaker-3p': 'A_switch_operate/15_disconnect/三極斷路器.elmt',
    'motor-protector': 'A_switch_operate/15_disconnect/三極馬達電路防護器.elmt',
    'overload': 'D_motor_actuator/20_motor_control/過載.elmt',
    'rcd': 'B_protect_power/01_protection/ddr2.elmt',
    # 3.4 接觸器與繼電器
    'coil': 'C_relay_control/16_relay_contact/繼電器線圈.elmt',
    'contactor-main-3p': 'D_motor_actuator/20_motor_control/三相起動器，常開接點.elmt',
    'coil-on-delay': 'C_relay_control/18_on_delay_timer/通電限時繼電器線圈.elmt',
    'contact-on-delay-no': 'C_relay_control/18_on_delay_timer/通電限時繼電器，常開接點.elmt',
    # 3.5 旋轉電機與變壓器
    'motor-3ph': 'D_motor_actuator/20_motor_control/三相馬達.elmt',
    'motor-1ph': 'D_motor_actuator/20_motor_control/單相馬達.elmt',
    'transformer': 'B_protect_power/14_fuse_breaker_xfmr/變壓器.elmt',
    'reactor': 'B_protect_power/14_fuse_breaker_xfmr/電抗器.elmt',
    # 3.6 電源與轉換
    'battery': 'G_electronic_misc/28_misc/電池.elmt',
    'rectifier-bridge': 'G_electronic_misc/29_electronic/橋式整流器.elmt',
    'power-supply': 'B_protect_power/06_power/power_supply_1_phase_ac_dc.elmt',
    # 3.7 感測器
    'proximity-no': 'A_switch_operate/26_other_switch/近接開關，常開接點.elmt',
    'photo-no': 'A_switch_operate/26_other_switch/光電開關，常開接點.elmt',
    'pressure-no': 'A_switch_operate/24_pressure_temp_switch/壓力開關，常開接點.elmt',
    'temp-no': 'A_switch_operate/24_pressure_temp_switch/溫度開關，常開接點.elmt',
    'thermocouple': 'E_indicate_sense/27_instrument/熱電偶.elmt',
    # 3.8 指示與訊號
    'lamp': 'E_indicate_sense/21_indicator_light/透明標準指示燈.elmt',
    'buzzer': 'G_electronic_misc/28_misc/蜂鳴器.elmt',
    'horn': 'G_electronic_misc/28_misc/喇叭.elmt',
    'ammeter': 'E_indicate_sense/27_instrument/電流表.elmt',
    # 3.9 半導體
    'diode': 'G_electronic_misc/29_electronic/二極體.elmt',
    'led': 'G_electronic_misc/29_electronic/LED.elmt',
    'zener': 'G_electronic_misc/29_electronic/稽納二極體.elmt',
    # === 以下取自 QET 官方元件庫(OFFICIAL::)===
    'chassis': 'OFFICIAL::10_allpole/110_network_supplies/masse.elmt',
    'manual-switch': '../third_party/10_electric/11_singlepole/interrupteur.elmt',
    'load-switch-3p': 'OFFICIAL::10_allpole/200_fuses_protective_gears/20_disconnecting_switches/inter_sectionneur_tri.elmt',
    'spd': 'OFFICIAL::10_allpole/200_fuses_protective_gears/90_overvoltage_protections/parafoudre_3.elmt',
    'latching-coil': 'C_relay_control/17_latching_relay/閉鎖式繼電器線圈.elmt',
    'generator': 'OFFICIAL::11_singlepole/392_generators_sources/10_generators/generatrice.elmt',
    'autotransformer': 'OFFICIAL::11_singlepole/330_transformers_power_supplies/10_transformers/autotransformator_1f_1.elmt',
    'vfd': 'OFFICIAL::10_allpole/340_converters_inverters/10_converters/ac1_ac1.elmt',
    'level-no': 'OFFICIAL::10_allpole/390_sensors_instruments/12_sensors_level/niv_liquide_no.elmt',
    'encoder': 'OFFICIAL::10_allpole/390_sensors_instruments/80_encoder/codeur.elmt',
    'hour-meter': 'OFFICIAL::10_allpole/390_sensors_instruments/70_meters_measuring_indicators/compteur_horaire_08-04-03_en60617.elmt',
    'optocoupler': 'OFFICIAL::10_allpole/395_electronics_semiconductors/12_transistors/interface_optocoupleur.elmt',
}

if __name__ == '__main__':
    fails = []
    for slug, rel in ELEMENTS.items():
        if rel.startswith('OFFICIAL::'):
            src = os.path.join(OFFICIAL, rel[len('OFFICIAL::'):])
        else:
            src = os.path.join(LIB, rel)
        dst = os.path.join(OUT, f'qet-{slug}.svg')
        try:
            convert(src, dst)
        except Exception as e:
            fails.append((slug, str(e)))
    if fails:
        print('\n轉換失敗:')
        for s, e in fails:
            print(f'  {s}: {e}')
        sys.exit(1)
    print(f'\n共 {len(ELEMENTS)} 個元件轉換完成')
