// alt1://addapp/https://6yw83p.csb.app/appconfig.json

import React, { useEffect, useRef, useState } from "react"
import { createRoot } from "react-dom/client"
import { mixColor } from "alt1/base"
import ChatBoxReader from "alt1/chatbox"
import { displayDetectionMessage, alt1 } from "./helpers"

const skills = [
    { name: "Agility", type: "both" },
    { name: "Construction", type: "both" },
    { name: "Cooking", type: "stone" },
    { name: "Crafting", type: "both" },
    { name: "Divination", type: "gold" },
    { name: "Dungeoneering", type: "gold" },
    { name: "Farming", type: "both" },
    { name: "Firemaking", type: "stone" },
    { name: "Fishing", type: "stone" },
    { name: "Fletching", type: "stone" },
    { name: "Herblore", type: "both" },
    { name: "Hunter", type: "stone" },
    { name: "Magic", type: "gold" },
    { name: "Melee", type: "gold" },
    { name: "Mining", type: "both" },
    { name: "Prayer", type: "gold" },
    { name: "Ranged", type: "gold" },
    { name: "Runecrafting", type: "stone" },
    { name: "Slayer", type: "gold" },
    { name: "Smithing", type: "both" },
    { name: "Summoning", type: "gold" },
    { name: "Thieving", type: "stone" },
    { name: "Woodcutting", type: "both" }
]

const STORAGE_KEY = "rockTrackerState"

const createNewReader = () => {
    const reader = new ChatBoxReader()
    reader.readargs = {
        colors: [
            mixColor(0, 255, 0), //Rock notification
            mixColor(127, 169, 255) // Clock blue
        ]
    }
    return reader
}

function App() {
    const [pieces, setPieces] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) return JSON.parse(saved)

        const init = {}
        skills.forEach((skill) => {
            init[skill.name] = { gold: 0, stone: 0 }
        })
        return init
    })

    const [lastGoldFound, setLastGoldFound] = useState("")
    const [lastStoneFound, setLastStoneFound] = useState("")
    const [showCompleted, setShowCompleted] = useState(false)
    const [showResetConfirmation, setShowResetConfirmation] = useState(false)
    const readerRef = useRef(createNewReader())

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(pieces))
    }, [pieces])

    const [chatReady, setChatReady] = useState(false)

    useEffect(() => {
        const reader = readerRef.current
        let lastFindTime = Date.now()
        let findInterval = 2000
        let lostFindInterval = 500
        let chatboxLost = false
        let lastTimestamp = ""
        let seenMessagesAtTimestamp = new Set()

        const tick = () => {
            try {
                const chatLines = reader.read()
                const now = Date.now()

                // Chatbox check
                if (
                    (chatboxLost && now - lastFindTime > lostFindInterval) ||
                    (!chatboxLost && now - lastFindTime > findInterval)
                ) {
                    lastFindTime = now

                    const found = reader.find()
                    if (!found) {
                        if (!chatboxLost) {
                            console.warn("⚠️ Chatbox lost! Trying to find...")
                            displayDetectionMessage("⚠️ Can't detect chatbox!\nPress Enter inside RuneScape!", 600, 30)
                            setChatReady(false)
                            chatboxLost = true
                        }
                    } else {
                        if (chatboxLost) {
                            console.log("✅ Chatbox found again!")
                            setChatReady(true)
                            chatboxLost = false

                            if (reader.pos) {
                                alt1.overLayRect(
                                    mixColor(45, 186, 21),
                                    reader.pos.mainbox.rect.x,
                                    reader.pos.mainbox.rect.y,
                                    reader.pos.mainbox.rect.width,
                                    reader.pos.mainbox.rect.height,
                                    1000,
                                    1
                                )
                            }
                        }
                    }
                }

                // Process chat lines
                if (chatLines) {
                    for (const line of chatLines) {
                        const text = line.text

                        console.log("📝 Raw line:", text)

                        // 🕒 Extract timestamp
                        const timestampMatch = text.match(/^\[(\d{2}:\d{2}:\d{2})\]/)
                        let timestamp = ""

                        if (timestampMatch) {
                            timestamp = timestampMatch[1]
                        }

                        if (!timestamp) {
                            console.log("⏩ Skipping line (no timestamp):", text)
                            continue
                        }

                        console.log("⏰ Timestamp detected:", timestamp)

                        // ✨ Important Fix:
                        // Only reset the seenMessagesAtTimestamp IF the timestamp moves FORWARD
                        if (timestamp !== lastTimestamp) {
                            if (seenMessagesAtTimestamp.size > 0) {
                                console.log(
                                    `🔄 New timestamp: ${timestamp} (old: ${lastTimestamp}) -> resetting seen set.`
                                )
                                seenMessagesAtTimestamp = new Set()
                            }
                            lastTimestamp = timestamp
                        }

                        if (seenMessagesAtTimestamp.has(text)) {
                            console.log("⚠️ Already seen this message at current timestamp, skipping:", text)
                            continue
                        }

                        // 🚀 New message, let's process it
                        console.log("✅ New message detected, processing:", text)
                        seenMessagesAtTimestamp.add(text)

                        if (text.includes("You find a golden rock")) {
                            const match = text.match(/\((.*?)\)/)
                            if (match) {
                                const skillName = match[1]
                                if (skills.find((s) => s.name === skillName)) {
                                    console.log(`🏆 Golden rock found for skill: ${skillName}`)
                                    setPieces((prev) => ({
                                        ...prev,
                                        [skillName]: {
                                            ...prev[skillName],
                                            gold: Math.min(prev[skillName].gold + 1, 2)
                                        }
                                    }))
                                    setLastGoldFound(skillName)
                                }
                            }
                        } else if (text.includes("You find a strange rock")) {
                            const match = text.match(/\((.*?)\)/)
                            if (match) {
                                const skillName = match[1]
                                if (skills.find((s) => s.name === skillName)) {
                                    console.log(`🪨 Strange rock found for skill: ${skillName}`)
                                    setPieces((prev) => ({
                                        ...prev,
                                        [skillName]: {
                                            ...prev[skillName],
                                            stone: Math.min(prev[skillName].stone + 1, 2)
                                        }
                                    }))
                                    setLastStoneFound(skillName)
                                }
                            }
                        }
                    }
                }
            } catch (e) {
                console.error("Tick error:", e)
            }
        }

        const interval = setInterval(tick, 100)

        return () => clearInterval(interval)
    }, [skills])

    const getColor = (count, max, skillName, type) => {
        if (type === "gold" && lastGoldFound === skillName) return "#a56eff"
        if (type === "stone" && lastStoneFound === skillName) return "#a56eff"
        if (count === 0) return "#661111"
        if (count === 1) return "#ffaa00"
        if (count >= max) return "#33cc33"
        return "#aa3333"
    }

    const handleClick = (skillName, type) => {
        setPieces((prev) => {
            const updated = { ...prev }
            updated[skillName][type] = (updated[skillName][type] + 1) % 3
            return updated
        })
        if (type === "gold") {
            setLastGoldFound(skillName)
        } else {
            setLastStoneFound(skillName)
        }
    }

    const completedSkills = skills.filter((skill) => {
        const piece = pieces[skill.name]
        const goldDone = skill.type === "gold" || skill.type === "both" ? piece.gold >= 2 : true
        const stoneDone = skill.type === "stone" || skill.type === "both" ? piece.stone >= 2 : true
        return goldDone && stoneDone
    })

    const activeSkills = skills.filter((skill) => !completedSkills.includes(skill))

    const handleReset = () => {
        setShowResetConfirmation(true)
    }

    const confirmReset = () => {
        const reset = {}
        skills.forEach((skill) => {
            reset[skill.name] = { gold: 0, stone: 0 }
        })
        setPieces(reset)
        setLastGoldFound("")
        setLastStoneFound("")
        localStorage.removeItem(STORAGE_KEY)
        setShowResetConfirmation(false)
    }

    const cancelReset = () => {
        setShowResetConfirmation(false)
    }

    const renderSkillRow = (skill) => {
        const piece = pieces[skill.name]
        const goldMax = skill.type === "gold" || skill.type === "both" ? 2 : 0
        const stoneMax = skill.type === "stone" || skill.type === "both" ? 2 : 0
        return (
            <tr key={skill.name}>
                <td>{skill.name.slice(0, 4)}</td> {/* Shortened skill name */}
                <td
                    onClick={() => handleClick(skill.name, "gold")}
                    style={{
                        backgroundColor: getColor(piece.gold, goldMax, skill.name, "gold"),
                        cursor: "pointer",
                        userSelect: "none"
                    }}
                >
                    {skill.type === "stone" ? "-" : `${piece.gold}/${goldMax}`}
                </td>
                <td
                    onClick={() => handleClick(skill.name, "stone")}
                    style={{
                        backgroundColor: getColor(piece.stone, stoneMax, skill.name, "stone"),
                        cursor: "pointer",
                        userSelect: "none"
                    }}
                >
                    {skill.type === "gold" ? "-" : `${piece.stone}/${stoneMax}`}
                </td>
            </tr>
        )
    }

    return (
        <div
            style={{
                padding: "10px",
                fontFamily: "Verdana, sans-serif",
                backgroundColor: "#111",
                color: "#eee",
                minHeight: "100vh"
            }}
        >
            <h1 style={{ textAlign: "center", color: "#ffd700", marginBottom: "10px" }}>Rocks</h1>

            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                    <tr style={{ backgroundColor: "#222" }}>
                        <th>Skill</th>
                        <th>Gold</th> {/* Shortened column name */}
                        <th>Str</th> {/* Shortened column name */}
                    </tr>
                </thead>
                <tbody>{activeSkills.map(renderSkillRow)}</tbody>
            </table>

            <div style={{ marginTop: "20px" }}>
                <button
                    onClick={() => setShowCompleted((s) => !s)}
                    style={{
                        background: "#333",
                        padding: "8px",
                        color: "#ddd",
                        borderRadius: "5px",
                        cursor: "pointer",
                        border: "none"
                    }}
                >
                    {showCompleted ? "Hide" : "Show"} Completed Skills ({completedSkills.length})
                </button>

                {showCompleted && (
                    <table style={{ width: "100%", marginTop: "10px", borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ backgroundColor: "#222" }}>
                                <th>Skill</th>
                                <th>Gold</th>
                                <th>Str</th>
                            </tr>
                        </thead>
                        <tbody>{completedSkills.map(renderSkillRow)}</tbody>
                    </table>
                )}
            </div>

            <div style={{ marginTop: "20px", textAlign: "center" }}>
                <button
                    onClick={handleReset}
                    style={{
                        backgroundColor: "#f00",
                        color: "#fff",
                        padding: "10px 20px",
                        borderRadius: "5px",
                        cursor: "pointer",
                        border: "none"
                    }}
                >
                    Reset Progress
                </button>
            </div>

            {showResetConfirmation && (
                <div
                    style={{
                        position: "fixed",
                        top: "0",
                        left: "0",
                        right: "0",
                        bottom: "0",
                        backgroundColor: "rgba(0, 0, 0, 0.7)",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        color: "#fff"
                    }}
                >
                    <div
                        style={{
                            backgroundColor: "#222",
                            padding: "20px",
                            borderRadius: "10px",
                            textAlign: "center"
                        }}
                    >
                        <h2>Are you sure you want to reset all progress?</h2>
                        <button
                            onClick={confirmReset}
                            style={{
                                backgroundColor: "#f00",
                                color: "#fff",
                                padding: "10px 20px",
                                margin: "10px",
                                cursor: "pointer"
                            }}
                        >
                            Yes, Reset
                        </button>
                        <button
                            onClick={cancelReset}
                            style={{
                                backgroundColor: "#333",
                                color: "#fff",
                                padding: "10px 20px",
                                margin: "10px",
                                cursor: "pointer"
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

createRoot(document.getElementById("root")!).render(<App />)

const clearPopupInterval = setInterval(() => {
    // Removes the "Open with sandbox button" as it won't scale
    // Super hate this but no other good options and this is already public
    // https://github.com/codesandbox/codesandbox-client/issues/3912
    document.body.querySelectorAll("iframe").forEach((iframe) => {
        if (iframe.id.startsWith("sb__open-sandbox")) {
            const node = document.createElement("div")
            node.style.setProperty("display", "none", "important")
            node.id = iframe.id
            document.getElementById(iframe.id)?.remove()
            document.body.appendChild(node)

            clearInterval(clearPopupInterval)
        }
    })
}, 250)
