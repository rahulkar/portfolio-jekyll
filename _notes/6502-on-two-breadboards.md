---
title: the 6502 on two breadboards
date: 2026-10-11
description: A W65C02, an EEPROM, 32K of RAM and a 16×2 LCD that boots up and says hello, all point-to-point jumper wire.
photo: true
feed_id: /scribbles/6502-on-two-breadboards
---
A W65C02 running at a crystal's pace, an EEPROM holding the program, 32K of RAM, one 74HC00 doing the glue logic, and a 16&times;2 LCD that boots up and says hello. Everything is point-to-point jumper wire, which is exactly the point: nothing sits between you and the bus.

{% include polaroid-6502.html id="scribble-lightbox" class="scribble__photo" caption="boots up, says hello" %}

It is the best teacher I know for the things cloud consoles hide: address decoding, timing, what a byte actually costs. The "it just works" in my day job started out as a wire like one of these.

The build order matters more than any part. Clock first, then reset, then the address bus with LEDs on it so you can watch the CPU count. Only when the counting is boring do you add memory, and only when memory is boring do you add the LCD. Every platform I have shipped since follows the same rule: make the boring layer trustworthy before building the interesting one on top.
