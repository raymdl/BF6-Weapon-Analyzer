# PP-19 53-round magazine compatibility trace

Date: 2026-09-14. Source: local Frosty export 1.4.2.5. Investigation only; no analyzer behavior changed.

Follow-up implementation: `scripts/frosty-attachment-compatibility.py` now
generates shared slots and equipment dependencies for all mapped weapons.
The analyzer enforces these through `sim/loadout.js`. The findings below retain
the investigation's original source trace and operand inventory.

## Finding

Equipment_PP19.xml contains twelve underbarrel dependency entries in Field_e70ce6be (Struct_4f9523cc). Each entry pairs an attachment in Field_399fae20 with five attachment IDs in Field_f4142987. All five IDs resolve to the other PP-19 magazines. The 53-round Extended4 ID, 0x81260446, is absent from every underbarrel entry. All twelve exported Attachment_PP19_BTM files are covered.

This structure, together with the supplied 30/53-round screenshots (underbarrel slot present/absent), supports the rule: PP-19 53-round magazine makes every underbarrel unavailable. The rule is represented on the underbarrel dependencies in the equipment configuration, not as an explicit disable-underbarrel operand in the magazine stat modifier. Field names remain hashed; this is source structure plus observed UI evidence, not a claim that native code was decompiled.

## Magazine IDs

| Source attachment | ID | In each underbarrel dependency list |
|---|---|---|
| Attachment_PP19_MAG_Compact1 | `0x014c3828` | Yes |
| Attachment_PP19_MAG_Compact2 | `0xb1f43cb9` | Yes |
| Attachment_PP19_MAG_Extended1 | `0x0a9f9b86` | Yes |
| Attachment_PP19_MAG_Extended4 | `0x81260446` | No |
| Attachment_PP19_MAG_Fast | `0xe8e48809` | Yes |
| Attachment_PP19_MAG_Regular | `0x41b463e4` | Yes |

## Underbarrels checked

- Attachment_PP19_BTM_FABTFS [625326c4-ac91-43d8-94f5-f1963e332b28]
- Attachment_PP19_BTM_ZenitcoRK1 [087028aa-dcc3-4f3e-8f7e-a400c4b0d970]
- Attachment_PP19_BTM_TangoDownVertical [644ad3eb-24b8-4cbf-b091-f8c931ebd98f]
- Attachment_PP19_BTM_6Ch64Vertical [a59c40a9-02fb-4541-b234-4b7cccb08df4]
- Attachment_PP19_BTM_KACVerticalGrip [ac49afcb-e0a0-4fe1-a5c1-0513dc5c9b55]
- Attachment_PP19_BTM_TangoStubby [773561bc-a547-42f6-b41a-5be0fa3bcf96]
- Attachment_PP19_BTM_MSBSA2Grip [7f36c061-253f-4a71-927e-8b71e38a509e]
- Attachment_PP19_BTM_MagpulMVG [b0af1bd0-4c2b-4b2c-961b-18c5f84f8a9c]
- Attachment_PP19_BTM_BCMStubby [429752b8-f5c5-4a89-b697-183c5e1928aa]
- Attachment_PP19_BTM_MagpulAFGPDW [74a2b6f3-00e5-4ace-9aca-1853dccaaa52]
- Attachment_PP19_BTM_EVOHandstop [5e438cdb-715f-48fa-a21c-39f0a64642bf]
- Attachment_PP19_BTM_LWRCIVFG [24dafed7-50fb-46de-aa2e-28a693b937e5]

## Trace and limits

- Ability root Field_d7605aab selects branch 437c8bee-9bab-42ea-905e-6e203790b37c for U_PRG_PP19_MAG_Extended4. The branch uses SC_Magazine and action 2af1fee3-f1ba-4950-a48e-2e9aec754dfd.
- That action selects both U_WPM_MAG_053Ext4_PP19_W55 and U_ATT_PP19_MagazineHelical.
- The stat selector resolves through the WB modifier list to WPM_MAG_053Ext4_PP19_W55. All three effect objects and every exported leaf value are retained below: Class_e7d2410a (magazine/ammunition), Class_303a33cc (ADS movement), Class_7d916d6b (reload). No GS binding matched this stat selector.
- Ability/equipment category tags resolve to U_PP19 - MAG - Extended 4 and Magazine Slot. The magazine killswitch exported default and local fallback are both False. No live override is inferred.
- A corpus-wide search for the attachment, progression, stat-selector and art-selector GUIDs and three unlock hashes found additional equipment and team-collection references; the equipment dependency IDs are the decisive compatibility evidence.
- Every operand in the linked stat effect blocks was inspected. Hashed flags/enums without decoded names remain raw; this is not a claim that every native semantic or every asset in the game is known.
- The existing frosty-configuration.py attachment graph explicitly skips art/cosmetic unlocks and does not read Equipment_PP19.xml dependency lists. The analyzer fixed-slot resolver does not evaluate magazine-dependent availability.

## Decisive source block

```xml
<Struct_4f9523cc>
          <Field_399fae20>
            <Struct_490b9894>
              <Field_def7f8dd>
                <Struct_181e89a5>
                  <Field_e0b43a29>
                    <Struct_9bc51bd0>
                      <Field_6b28f68f>[Ebx] Common/GameSetup/Tweakables/Killswitches/KST_CH1_S3_Weapons [cd240a10-850b-4f5c-8d12-1f0a3f922e76]</Field_6b28f68f>
                    </Struct_9bc51bd0>
                      </Field_e0b43a29>
                  <Field_043d7a08>False</Field_043d7a08>
                </Struct_181e89a5>
                  </Field_def7f8dd>
              <Field_5aec774f>[Class_e923016e] fec8b620-c4ec-4ff8-8474-64b1021b8079</Field_5aec774f>
              <Field_d28dfb00>[Ebx] Common/Hardware/Weapons/SMG/PP19/Attachment_PP19_BTM_FABTFS [625326c4-ac91-43d8-94f5-f1963e332b28]</Field_d28dfb00>
              <Field_f86e0433>[Ebx] Common/Hardware/Weapons/SMG/PP19/U_PRG_PP19_BTM_FABTFS [ef88122e-fe61-4028-af8e-411bfbead1c3]</Field_f86e0433>
            </Struct_490b9894>
              </Field_399fae20>
          <Field_f4142987 Count="5">
            <member Index="0">0x41b463e4</member>
            <member Index="1">0xe8e48809</member>
            <member Index="2">0x014c3828</member>
            <member Index="3">0xb1f43cb9</member>
            <member Index="4">0x0a9f9b86</member>
        </Field_f4142987>
        </Struct_4f9523cc>
```

## Exact magazine and stat operand inventory

### Attachment_PP19_MAG_Extended4.xml

Source: `Common/Hardware/Weapons/SMG/PP19/Attachment_PP19_MAG_Extended4.xml`
SHA-256: `663355aa271db9213c0a99b19c2646ee806cda95b19ed75187949a7e56831210`

```xml
<File Guid="9b04af6c-ffba-430d-9fbd-bb83e23f17e6">
  <Class_a9b2eb87 Guid="6b99482c-fa0a-47db-9ebc-2093cc656933">
    <Field_0c59fa06>Common/Hardware/Weapons/SMG/PP19/Attachment_PP19_MAG_Extended4</Field_0c59fa06>
    <Field_de6f63b3>0x81260446</Field_de6f63b3>
    <Field_157a7d74>[Ebx] Common/Hardware/Weapons/SMG/PP19/U_PRG_PP19_MAG_Extended4 [f753a586-6a9e-467d-8017-db925e6a9a51]</Field_157a7d74>
    <Field_fe77e9a9>[Ebx] Common/Hardware/Weapons/_Attachments/AttachmentCategory_Magazine [454d198f-27ad-4405-a441-d14bbd31dfc8]</Field_fe77e9a9>
    <Field_6ee865a5>0x0000002d</Field_6ee865a5>
    <Field_46de69bc>
      <Struct_46de69bc>
        <Field_c1ad37da>0x3c70f269</Field_c1ad37da>
      </Struct_46de69bc>
        </Field_46de69bc>
  </Class_a9b2eb87>
</File>
```

### U_PRG_PP19_MAG_Extended4.xml

Source: `Common/Hardware/Weapons/SMG/PP19/U_PRG_PP19_MAG_Extended4.xml`
SHA-256: `79f354dc25d160572b9c6b5e3eb8577bb3207622061622814ba1de4309116c20`

```xml
<File Guid="08f6fcd4-62eb-4069-9c39-0038fa89ef5c">
  <Class_bc0062dc Guid="f753a586-6a9e-467d-8017-db925e6a9a51">
    <Field_0c59fa06>Common/Hardware/Weapons/SMG/PP19/U_PRG_PP19_MAG_Extended4</Field_0c59fa06>
    <Field_5aec774f>nullptr</Field_5aec774f>
    <Field_9d34093f>U_PRG_PP19_MAG_Extended4</Field_9d34093f>
    <Field_de6f63b3>0x04d4f556</Field_de6f63b3>
    <Field_32cf19f5>False</Field_32cf19f5>
  </Class_bc0062dc>
</File>
```

### U_ATT_PP19_MagazineHelical.xml

Source: `Common/Hardware/Weapons/SMG/PP19/Art/U_ATT_PP19_MagazineHelical.xml`
SHA-256: `ef5b1eaba47799eccf1a492a70fe5bbb08db0a327a2bf078e9da644f333548f3`

```xml
<File Guid="b429b9b7-999a-4665-b9e9-8c55b3c229f0">
  <Class_bc0062dc Guid="54db56c8-8ff3-4384-8a8a-6a3d1905fb93">
    <Field_0c59fa06>Common/Hardware/Weapons/SMG/PP19/Art/U_ATT_PP19_MagazineHelical</Field_0c59fa06>
    <Field_5aec774f>nullptr</Field_5aec774f>
    <Field_9d34093f>U_ATT_PP19_MagazineHelical</Field_9d34093f>
    <Field_de6f63b3>0xf530daba</Field_de6f63b3>
    <Field_32cf19f5>True</Field_32cf19f5>
  </Class_bc0062dc>
</File>
```

### U_WPM_MAG_053Ext4_PP19_W55.xml

Source: `Common/Hardware/Weapons/_WeaponModifiers/_Magazine/ExtendedMagazine/U_WPM_MAG_053Ext4_PP19_W55.xml`
SHA-256: `ef5eff0291e9c30381f4a0728ed8efbe65a0f8c44368966928f5ed560750490a`

```xml
<File Guid="cd904b8f-75e8-4228-96e9-472ff4e0134e">
  <Class_bc0062dc Guid="8c0e6842-6d5f-46cf-b5f7-4ad16a2cc13e">
    <Field_0c59fa06>Common/Hardware/Weapons/_WeaponModifiers/_Magazine/ExtendedMagazine/U_WPM_MAG_053Ext4_PP19_W55</Field_0c59fa06>
    <Field_5aec774f>nullptr</Field_5aec774f>
    <Field_9d34093f>U_WPM_MAG_053Ext4_PP19_W55</Field_9d34093f>
    <Field_de6f63b3>0xf8068edd</Field_de6f63b3>
    <Field_32cf19f5>True</Field_32cf19f5>
  </Class_bc0062dc>
</File>
```

### WPM_MAG_053Ext4_PP19_W55.xml

Source: `Common/Hardware/Weapons/_WeaponModifiers/_Magazine/ExtendedMagazine/WPM_MAG_053Ext4_PP19_W55.xml`
SHA-256: `ccb94f57f17fbcc30981dd0e6010d4553119cd666c7678b45ee6a93723647304`

```xml
<File Guid="66bd392c-a32c-47c8-bbe3-e75deb60c826">
  <Class_b2468102 Guid="77af8eed-9e9c-41f1-8196-6a4d05af1805">
    <Field_0c59fa06>Common/Hardware/Weapons/_WeaponModifiers/_Magazine/ExtendedMagazine/WPM_MAG_053Ext4_PP19_W55</Field_0c59fa06>
    <Field_50f33881>[Class_897c99a7] a6155757-d982-48ea-b551-a3a088920cf7</Field_50f33881>
  </Class_b2468102>
  <Class_897c99a7 Guid="a6155757-d982-48ea-b551-a3a088920cf7">
    <Field_819acc98 Count="1">
      <member Index="0">8c0e6842-6d5f-46cf-b5f7-4ad16a2cc13e</member>
  </Field_819acc98>
    <Field_9690d604 Count="3">
      <member Index="0">[Class_e7d2410a] e1a5d77c-1b06-4f28-8980-7d404ba835e0</member>
      <member Index="1">[Ebx] Common/Hardware/Weapons/_WeaponModifiers/ADSMoveSpeed/WME_ADSMoveSpeed_M05 [20eae443-52ef-4b08-9b5b-313446a00033]</member>
      <member Index="2">[Class_7d916d6b] bf6006fd-4dbc-4eb8-b191-6b678fde6121</member>
  </Field_9690d604>
    <Field_1c31def0>
      <Struct_9bc51bd0>
        <Field_6b28f68f>nullptr</Field_6b28f68f>
      </Struct_9bc51bd0>
        </Field_1c31def0>
  </Class_897c99a7>
  <Class_e7d2410a Guid="e1a5d77c-1b06-4f28-8980-7d404ba835e0">
    <Field_3f680d24>0x00000001</Field_3f680d24>
    <Field_9ca063e9>False</Field_9ca063e9>
    <Field_96eb74f6>False</Field_96eb74f6>
    <Field_d396a5f7>
      <Struct_9bc51bd0>
        <Field_6b28f68f>nullptr</Field_6b28f68f>
      </Struct_9bc51bd0>
        </Field_d396a5f7>
    <Field_e8134251>
      <Struct_9bc51bd0>
        <Field_6b28f68f>nullptr</Field_6b28f68f>
      </Struct_9bc51bd0>
        </Field_e8134251>
    <Field_7f22bfb4>0x00000036</Field_7f22bfb4>
    <Field_4614adfe>0x00000004</Field_4614adfe>
    <Field_80a58418>0xffffffff</Field_80a58418>
    <Field_bd024e1d>0xffffffff</Field_bd024e1d>
    <Field_54315b82>1</Field_54315b82>
    <Field_d1d55a1b>1</Field_d1d55a1b>
    <Field_9e2714f7>0x00000000</Field_9e2714f7>
    <Field_ca77c408>0x00000000</Field_ca77c408>
    <Field_49ac3d27>1</Field_49ac3d27>
    <Field_e767b8cb>1</Field_e767b8cb>
    <Field_dbecaf0b>0x00000000</Field_dbecaf0b>
    <Field_05ccf49e>
      <Struct_9bc51bd0>
        <Field_6b28f68f>nullptr</Field_6b28f68f>
      </Struct_9bc51bd0>
        </Field_05ccf49e>
  </Class_e7d2410a>
  <Class_7d916d6b Guid="bf6006fd-4dbc-4eb8-b191-6b678fde6121">
    <Field_3f680d24>0xffffffff</Field_3f680d24>
    <Field_9ca063e9>False</Field_9ca063e9>
    <Field_96eb74f6>False</Field_96eb74f6>
    <Field_d396a5f7>
      <Struct_9bc51bd0>
        <Field_6b28f68f>nullptr</Field_6b28f68f>
      </Struct_9bc51bd0>
        </Field_d396a5f7>
    <Field_d15a0c1c Count="2">
      <member Index="0">
        <Struct_b50f190f>
          <Field_c59cc6a8>0x0000003d</Field_c59cc6a8>
          <Field_82265a82>0x00000001</Field_82265a82>
          <Field_6e081af4>Field_bdf28a41</Field_6e081af4>
          <Field_9c1e1476>0.79</Field_9c1e1476>
          <Field_1c533b56>1</Field_1c533b56>
          <Field_c0c7c72f>0</Field_c0c7c72f>
          <Field_27b15985>0</Field_27b15985>
          <Field_85ff24a0>0</Field_85ff24a0>
          <Field_fc66e75e>2.667</Field_fc66e75e>
          <Field_b480c17a>0</Field_b480c17a>
          <Field_dc244b57 Count="0"></Field_dc244b57>
          <Field_983c2aa9>
            <Struct_9bc51bd0>
              <Field_6b28f68f>nullptr</Field_6b28f68f>
            </Struct_9bc51bd0>
              </Field_983c2aa9>
        </Struct_b50f190f>
          </member>
      <member Index="1">
        <Struct_b50f190f>
          <Field_c59cc6a8>0x00000000</Field_c59cc6a8>
          <Field_82265a82>0x00000000</Field_82265a82>
          <Field_6e081af4>Field_bdf28a41</Field_6e081af4>
          <Field_9c1e1476>0.72</Field_9c1e1476>
          <Field_1c533b56>1</Field_1c533b56>
          <Field_c0c7c72f>0</Field_c0c7c72f>
          <Field_27b15985>0</Field_27b15985>
          <Field_85ff24a0>3</Field_85ff24a0>
          <Field_fc66e75e>2.666667</Field_fc66e75e>
          <Field_b480c17a>0</Field_b480c17a>
          <Field_dc244b57 Count="4">
            <member Index="0">0.5</member>
            <member Index="1">0.65</member>
            <member Index="2">2.316667</member>
            <member Index="3">3.067</member>
        </Field_dc244b57>
          <Field_983c2aa9>
            <Struct_9bc51bd0>
              <Field_6b28f68f>nullptr</Field_6b28f68f>
            </Struct_9bc51bd0>
              </Field_983c2aa9>
        </Struct_b50f190f>
          </member>
  </Field_d15a0c1c>
    <Field_2df578bb>
      <Struct_9bc51bd0>
        <Field_6b28f68f>nullptr</Field_6b28f68f>
      </Struct_9bc51bd0>
        </Field_2df578bb>
  </Class_7d916d6b>
</File>
```

### WME_ADSMoveSpeed_M05.xml

Source: `Common/Hardware/Weapons/_WeaponModifiers/ADSMoveSpeed/WME_ADSMoveSpeed_M05.xml`
SHA-256: `ce6b07a86105f26e45e57da1fc8c26aea6575a765ee7ea1839ce93201a80d33c`

```xml
<File Guid="60421291-3bcc-4679-ad87-578375c82f40">
  <Class_b2468102 Guid="9163f974-cf8b-4554-b7b3-849adc9546bb">
    <Field_0c59fa06>Common/Hardware/Weapons/_WeaponModifiers/ADSMoveSpeed/WME_ADSMoveSpeed_M05</Field_0c59fa06>
    <Field_50f33881>[Class_303a33cc] 20eae443-52ef-4b08-9b5b-313446a00033</Field_50f33881>
  </Class_b2468102>
  <Class_303a33cc Guid="20eae443-52ef-4b08-9b5b-313446a00033">
    <Field_3f680d24>0xffffffff</Field_3f680d24>
    <Field_9ca063e9>False</Field_9ca063e9>
    <Field_96eb74f6>False</Field_96eb74f6>
    <Field_d396a5f7>
      <Struct_9bc51bd0>
        <Field_6b28f68f>nullptr</Field_6b28f68f>
      </Struct_9bc51bd0>
        </Field_d396a5f7>
    <Field_e8134251>
      <Struct_9bc51bd0>
        <Field_6b28f68f>nullptr</Field_6b28f68f>
      </Struct_9bc51bd0>
        </Field_e8134251>
    <Field_92a52872>0x00000000</Field_92a52872>
    <Field_c427eabf>0xffffffff</Field_c427eabf>
    <Field_b086ced5>
      <Struct_9bc51bd0>
        <Field_6b28f68f>nullptr</Field_6b28f68f>
      </Struct_9bc51bd0>
        </Field_b086ced5>
  </Class_303a33cc>
</File>
```

## Equipment source integrity

`Common/Hardware/Weapons/SMG/PP19/Equipment_PP19.xml`
SHA-256: `a6636a870ee2b54106458451a3287ac8644eee3f68cd88479f5cb723e8e02589`
