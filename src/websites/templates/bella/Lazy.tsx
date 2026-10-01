"use client";
import dynamic from "next/dynamic";
// Keep template CSS and font declarations behind their own client import boundary.
export default dynamic(() => import("./Bella"));
