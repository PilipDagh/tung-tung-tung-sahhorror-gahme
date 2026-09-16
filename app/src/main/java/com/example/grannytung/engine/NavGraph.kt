package com.example.grannytung.engine

import kotlin.math.abs
import kotlin.math.sqrt

data class NavNode(
    val id: String,
    val x: Float,
    val y: Float,
    val z: Float,
    val floor: Int,
    val edges: MutableList<NavEdge> = mutableListOf()
) {
    fun distanceTo(ox: Float, oy: Float, oz: Float): Float {
        val dx = x - ox
        val dy = y - oy
        val dz = z - oz
        return sqrt(dx * dx + dy * dy + dz * dz)
    }

    fun distanceTo(other: NavNode): Float = distanceTo(other.x, other.y, other.z)
}

data class NavEdge(
    val toId: String,
    val weight: Float
)

class NavGraph {
    val nodes = mutableMapOf<String, NavNode>()

    fun addNode(id: String, x: Float, y: Float, z: Float, floor: Int) {
        nodes[id] = NavNode(id, x, y, z, floor)
    }

    fun connect(idA: String, idB: String, bidirectional: Boolean = true) {
        val nodeA = nodes[idA] ?: return
        val nodeB = nodes[idB] ?: return

        val dist = nodeA.distanceTo(nodeB)
        val verticalDiff = abs(nodeA.y - nodeB.y)
        val weight = dist + if (verticalDiff > 0.5f) verticalDiff * 2.5f else 0f

        nodeA.edges.add(NavEdge(idB, weight))
        if (bidirectional) {
            nodeB.edges.add(NavEdge(idA, weight))
        }
    }

    fun getClosestNode(x: Float, y: Float, z: Float, preferredFloor: Int? = null): NavNode? {
        var bestNode: NavNode? = null
        var minDist = Float.MAX_VALUE

        for (node in nodes.values) {
            if (preferredFloor != null && abs(node.floor - preferredFloor) > 0.5f) {
                continue
            }
            val d = node.distanceTo(x, y, z)
            if (d < minDist) {
                minDist = d
                bestNode = node
            }
        }
        return bestNode
    }

    fun findPath(
        startX: Float, startY: Float, startZ: Float,
        targetX: Float, targetY: Float, targetZ: Float
    ): List<Triple<Float, Float, Float>> {
        val startNode = getClosestNode(startX, startY, startZ) ?: return listOf(Triple(targetX, targetY, targetZ))
        val endNode = getClosestNode(targetX, targetY, targetZ) ?: return listOf(Triple(targetX, targetY, targetZ))

        if (startNode.id == endNode.id) {
            return listOf(
                Triple(endNode.x, endNode.y, endNode.z),
                Triple(targetX, targetY, targetZ)
            )
        }

        val openSet = mutableSetOf(startNode.id)
        val cameFrom = mutableMapOf<String, String>()
        val gScore = mutableMapOf<String, Float>().withDefault { Float.MAX_VALUE }
        val fScore = mutableMapOf<String, Float>().withDefault { Float.MAX_VALUE }

        gScore[startNode.id] = 0f
        fScore[startNode.id] = startNode.distanceTo(endNode)

        while (openSet.isNotEmpty()) {
            var currentId: String? = null
            var lowestF = Float.MAX_VALUE
            for (id in openSet) {
                val f = fScore.getValue(id)
                if (f < lowestF) {
                    lowestF = f
                    currentId = id
                }
            }

            if (currentId == null) break

            if (currentId == endNode.id) {
                val path = mutableListOf(Triple(targetX, targetY, targetZ))
                var curr = currentId
                while (cameFrom.containsKey(curr)) {
                    val n = nodes[curr]!!
                    path.add(0, Triple(n.x, n.y, n.z))
                    curr = cameFrom[curr]!!
                }
                path.add(0, Triple(startX, startY, startZ))
                return path
            }

            openSet.remove(currentId)
            val currentNode = nodes[currentId] ?: continue

            for (edge in currentNode.edges) {
                val tentativeG = gScore.getValue(currentId) + edge.weight
                if (tentativeG < gScore.getValue(edge.toId)) {
                    cameFrom[edge.toId] = currentId
                    gScore[edge.toId] = tentativeG
                    val neighbor = nodes[edge.toId]
                    val h = neighbor?.distanceTo(endNode) ?: 0f
                    fScore[edge.toId] = tentativeG + h
                    openSet.add(edge.toId)
                }
            }
        }

        return listOf(Triple(targetX, targetY, targetZ))
    }
}
