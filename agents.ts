/**
 * Agent API Routes
 * 
 * Provides endpoints for retrieving agent data and performance metrics
 * to power the visualization dashboard.
 */
import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { log } from '../utils/logger';
import * as path from 'path';

const router = Router();

// Calculate date range based on time range parameter
const getDateRange = (timeRange: string) => {
  const now = new Date();
  let startDate = new Date();
  
  switch (timeRange) {
    case '24h':
      startDate.setHours(now.getHours() - 24);
      break;
    case '7d':
      startDate.setDate(now.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(now.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(now.getDate() - 90);
      break;
    default:
      // All time - set to a distant past date
      startDate = new Date(0);
      break;
  }
  
  return {
    startDate,
    endDate: now
  };
};

/**
 * GET /api/agents
 * Get all agents
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const agents = await storage.getAgents();
    return res.json(agents);
  } catch (error) {
    log('error', 'api', 'Failed to get agents', { error });
    return res.status(500).json({ error: 'Failed to get agents' });
  }
});

/**
 * GET /api/agents/:id
 * Get agent by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const agent = await storage.getAgentByAgentId(req.params.id);
    
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    return res.json(agent);
  } catch (error) {
    log('error', 'api', `Failed to get agent: ${req.params.id}`, { error });
    return res.status(500).json({ error: 'Failed to get agent' });
  }
});

/**
 * GET /api/agents/stats
 * Get agent statistics and performance metrics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const timeRange = req.query.timeRange as string || '30d';
    const agentId = req.query.agentId as string;
    const { startDate, endDate } = getDateRange(timeRange);
    
    // Get all agents
    const agents = await storage.getAgents();
    
    // Get all changes
    const allChanges = await storage.getChanges();
    
    // Filter changes by date range
    const filteredChanges = allChanges.filter(change => {
      const changeDate = new Date(change.createdAt);
      return changeDate >= startDate && changeDate <= endDate;
    });
    
    // Group changes by agent
    const changesByAgent: Record<string, any[]> = {};
    
    for (const change of filteredChanges) {
      if (!changesByAgent[change.agentId]) {
        changesByAgent[change.agentId] = [];
      }
      
      changesByAgent[change.agentId].push(change);
    }
    
    // Calculate performance metrics for each agent
    const performance = agents.map(agent => {
      const agentChanges = changesByAgent[agent.agentId] || [];
      
      // Count by status
      let approved = 0;
      let rejected = 0;
      let pending = 0;
      
      for (const change of agentChanges) {
        if (change.status === 'approved') {
          approved++;
        } else if (change.status === 'rejected') {
          rejected++;
        } else if (change.status === 'pending') {
          pending++;
        }
      }
      
      const totalChanges = agentChanges.length;
      const totalDecided = approved + rejected;
      const approvalRate = totalDecided > 0 
        ? Math.round((approved / totalDecided) * 100) 
        : 0;
      
      // Count unique file types
      const fileTypes = new Set<string>();
      for (const change of agentChanges) {
        const ext = path.extname(change.filePath);
        if (ext) {
          fileTypes.add(ext);
        }
      }
      
      // Get last activity timestamp
      let lastActivity = null;
      if (agentChanges.length > 0) {
        const sortedChanges = [...agentChanges].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        lastActivity = sortedChanges[0].createdAt;
      }
      
      // Calculate agent accuracy (if available in metadata)
      let accuracy = 0;
      const accuracyPoints = agentChanges
        .filter(change => change.metadata?.accuracy !== undefined)
        .map(change => change.metadata.accuracy);
      
      if (accuracyPoints.length > 0) {
        accuracy = Math.round(
          accuracyPoints.reduce((sum, val) => sum + val, 0) / accuracyPoints.length
        );
      } else {
        // Estimated accuracy based on approval rate
        accuracy = Math.min(Math.round(approvalRate * 0.9), 100);
      }
      
      return {
        agentId: agent.agentId,
        name: agent.name,
        type: agent.type,
        status: agent.status,
        totalChanges,
        approved,
        rejected,
        pending,
        approvalRate,
        fileTypesCount: fileTypes.size,
        lastActivity,
        accuracy,
        metadata: agent.metadata
      };
    }).sort((a, b) => b.totalChanges - a.totalChanges);
    
    // If specific agent requested, filter the results
    const result = {
      performance: agentId && agentId !== 'all' 
        ? performance.filter(p => p.agentId === agentId) 
        : performance,
      timeRange
    };
    
    return res.json(result);
  } catch (error) {
    log('error', 'api', 'Failed to get agent stats', { error });
    return res.status(500).json({ error: 'Failed to get agent statistics' });
  }
});

/**
 * GET /api/agents/timeline
 * Get agent performance over time
 */
router.get('/timeline', async (req: Request, res: Response) => {
  try {
    const timeRange = req.query.timeRange as string || '30d';
    const agentId = req.query.agentId as string;
    const { startDate, endDate } = getDateRange(timeRange);
    
    // Get all changes
    const allChanges = await storage.getChanges();
    
    // Filter changes by date range and agent if specified
    const filteredChanges = allChanges.filter(change => {
      const changeDate = new Date(change.createdAt);
      const dateInRange = changeDate >= startDate && changeDate <= endDate;
      
      if (agentId && agentId !== 'all') {
        return dateInRange && change.agentId === agentId;
      }
      
      return dateInRange;
    });
    
    // Group by date
    const groupedChanges: Record<string, { 
      changes: number,
      approved: number,
      rejected: number, 
      approvalRate: number
    }> = {};
    
    // Determine grouping (daily, weekly, monthly) based on time range
    const formatDate = (date: Date) => {
      if (timeRange === '24h') {
        // Group by hour
        return `${date.getHours()}:00`;
      } else if (timeRange === '7d') {
        // Group by day
        return date.toISOString().split('T')[0];
      } else {
        // Group by day for longer ranges too
        return date.toISOString().split('T')[0];
      }
    };
    
    // Initialize date series
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateKey = formatDate(currentDate);
      groupedChanges[dateKey] = { 
        changes: 0,
        approved: 0,
        rejected: 0,
        approvalRate: 0
      };
      
      if (timeRange === '24h') {
        currentDate.setHours(currentDate.getHours() + 1);
      } else {
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }
    
    // Count changes by date
    for (const change of filteredChanges) {
      const changeDate = new Date(change.createdAt);
      const dateKey = formatDate(changeDate);
      
      if (!groupedChanges[dateKey]) {
        groupedChanges[dateKey] = { 
          changes: 0,
          approved: 0,
          rejected: 0,
          approvalRate: 0
        };
      }
      
      groupedChanges[dateKey].changes++;
      
      if (change.status === 'approved') {
        groupedChanges[dateKey].approved++;
      } else if (change.status === 'rejected') {
        groupedChanges[dateKey].rejected++;
      }
    }
    
    // Calculate approval rates
    for (const [date, stats] of Object.entries(groupedChanges)) {
      const totalDecided = stats.approved + stats.rejected;
      groupedChanges[date].approvalRate = totalDecided > 0 
        ? Math.round((stats.approved / totalDecided) * 100)
        : 0;
    }
    
    // Convert to array for chart data
    const timelineData = Object.entries(groupedChanges)
      .map(([date, stats]) => ({
        date,
        changes: stats.changes,
        approved: stats.approved,
        rejected: stats.rejected,
        approvalRate: stats.approvalRate
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    return res.json({
      data: timelineData,
      timeRange,
      agentId
    });
  } catch (error) {
    log('error', 'api', 'Failed to get agent timeline', { error });
    return res.status(500).json({ error: 'Failed to get agent timeline' });
  }
});

/**
 * GET /api/agents/filetypes
 * Get file type statistics by agent
 */
router.get('/filetypes', async (req: Request, res: Response) => {
  try {
    const timeRange = req.query.timeRange as string || '30d';
    const agentId = req.query.agentId as string;
    const { startDate, endDate } = getDateRange(timeRange);
    
    // Get all changes
    const allChanges = await storage.getChanges();
    
    // Filter changes by date range and agent if specified
    const filteredChanges = allChanges.filter(change => {
      const changeDate = new Date(change.createdAt);
      const dateInRange = changeDate >= startDate && changeDate <= endDate;
      
      if (agentId && agentId !== 'all') {
        return dateInRange && change.agentId === agentId;
      }
      
      return dateInRange;
    });
    
    // Count by file extension
    const fileTypes: Record<string, { count: number, approved: number, rejected: number }> = {};
    for (const change of filteredChanges) {
      const ext = path.extname(change.filePath) || 'no-extension';
      
      if (!fileTypes[ext]) {
        fileTypes[ext] = { count: 0, approved: 0, rejected: 0 };
      }
      
      fileTypes[ext].count++;
      
      if (change.status === 'approved') {
        fileTypes[ext].approved++;
      } else if (change.status === 'rejected') {
        fileTypes[ext].rejected++;
      }
    }
    
    // Format for charts
    const fileTypesData = Object.entries(fileTypes).map(([name, stats]) => {
      const totalDecided = stats.approved + stats.rejected;
      const approvalRate = totalDecided > 0 
        ? Math.round((stats.approved / totalDecided) * 100)
        : 0;
        
      return {
        name: name === 'no-extension' ? 'No Extension' : name,
        count: stats.count,
        approved: stats.approved,
        rejected: stats.rejected,
        approvalRate
      };
    }).sort((a, b) => b.count - a.count);
    
    return res.json({
      data: fileTypesData,
      timeRange,
      agentId
    });
  } catch (error) {
    log('error', 'api', 'Failed to get agent file types', { error });
    return res.status(500).json({ error: 'Failed to get agent file types' });
  }
});

export default router;