---
title: A 6502 computer on two breadboards
date: 2026-10-11
last_modified_at: 2026-10-17
description: A homebrew W65C02S computer, the chips on the board, and some 6502 history.
feed_id: /scribbles/6502-on-two-breadboards
icon: circuit-board
art: breadboard
---
A homebrew 8-bit computer on two breadboards. Every connection is a jumper wire, so every signal can be traced by eye or with a probe.

{% include figure-6502.html sizes="(min-width: 64em) 894px, 100vw" %}

## On the board

- W65C02S CPU, the CMOS version of the 6502. Western Design Center still makes it.
- AT28C256 EEPROM (32 KB), which holds the program.
- HM62256 static RAM (32 KB).
- W65C22 interface chip with two 8-bit I/O ports. Its port lines run to the LCD.
- 74HC00 with four NAND gates, used as glue logic.
- A crystal oscillator for the clock, and a 16×2 character LCD that shows "6502 SBC" and www.rahulkar.com.

## Why the 6502

The 6502 came out in 1975 at $25, when competing CPUs cost several times that. A 6502 or a close variant ran the Apple II, the Commodore 64, the Atari 2600 and the NES.

It is small enough to learn completely: three main registers (A, X and Y), 56 instructions in the original chip, an 8-bit data bus and a 16-bit address bus, which gives it 64 KB to address. The first 256 bytes, the zero page, can be reached with shorter and faster instructions, and the stack lives in the next 256.

On a breadboard each address and data line is a wire you can probe. This board runs from a crystal oscillator, but the W65C02S is a static design, so with a slower clock source it can run at a few steps a second, or stop, without losing its state.
