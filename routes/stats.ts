/**
 * Statistics API Routes
 * 
 * Provides endpoints for retrieving statistics and metrics data
 * to power the visualization dashboard.
 */
import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { log } from '../utils/logger';
import { summarizeDiff } from '../utils/fileDiff';
import * as path from 'path';
import * as fs from 'fs-extra';
import { PROJECT_PATH } from '../config';

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
 * GET /api/stats
 * Get overall system statistics
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const timeRange = req.query.timeRange as string || '7d';
    const { startDate, endDate } = getDateRange(timeRange);
    
    // Get all changes
    const allChanges = await storage.getChanges();
    
    // Filter changes by date range
    const filteredChanges = allChanges.filter(change => {
      const changeDate = new Date(change.createdAt);
      return changeDate >= startDate && changeDate <= endDate;
    });
    
    // Count by status
    const statusCounts: Record<string, number> = {};
    for (const change of filteredChanges) {
      statusCounts[change.status] = (statusCounts[change.status] || 0) + 1;
    }
    
    // Calculate approval rate
    const approved = statusCounts['approved'] || 0;
    const rejected = statusCounts['rejected'] || 0;
    const totalDecided = approved + rejected;
    const approvalRate = totalDecided > 0 
      ? Math.round((approved / totalDecided) * 100) 
      : 0;
    
    // Get count of active agents
    const agents = await storage.getAgents();
    const activeAgents = agents.filter(agent => 
      filteredChanges.some(change => change.agentId === agent.agentId)
    ).length;
    
    // Get most active directory
    const directoryCounts: Record<string, number> = {};
    for (const change of filteredChanges) {
      const dir = path.dirname(change.filePath);
      directoryCounts[dir] = (directoryCounts[dir] || 0) + 1;
    }
    
    let mostActiveDirectory = 'N/A';
    let maxCount = 0;
    for (const [dir, count] of Object.entries(directoryCounts)) {
      if (count > maxCount) {
        maxCount = count;
        mostActiveDirectory = dir;
      }
    }
    
    // Format status distribution for pie chart
    const statusDistribution = Object.entries(statusCounts).map(([name, value]) => ({
      name,
      value
    }));
    
    return res.json({
      totalChanges: filteredChanges.length,
      approvalRate,
      activeAgents,
      mostActiveDirectory,
      statusDistribution,
      statusCounts,
      timeRange
    });
  } catch (error) {
    log('error', 'api', 'Failed to get stats', { error });
    return res.status(500).json({ error: 'Failed to get statistics' });
  }
});

/**
 * GET /api/stats/files
 * Get file statistics
 */
router.get('/files', async (req: Request, res: Response) => {
  try {
    const timeRange = req.query.timeRange as string || '7d';
    const { startDate, endDate } = getDateRange(timeRange);
    
    // Get all changes
    const allChanges = await storage.getChanges();
    
    // Filter changes by date range
    const filteredChanges = allChanges.filter(change => {
      const changeDate = new Date(change.createdAt);
      return changeDate >= startDate && changeDate <= endDate;
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
    
    // Count by directory
    const directoryCounts: Record<string, { count: number, approved: number, rejected: number }> = {};
    for (const change of filteredChanges) {
      const dir = path.dirname(change.filePath);
      
      if (!directoryCounts[dir]) {
        directoryCounts[dir] = { count: 0, approved: 0, rejected: 0 };
      }
      
      directoryCounts[dir].count++;
      
      if (change.status === 'approved') {
        directoryCounts[dir].approved++;
      } else if (change.status === 'rejected') {
        directoryCounts[dir].rejected++;
      }
    }
    
    // Format for charts
    const directoriesData = Object.entries(directoryCounts)
      .map(([name, stats]) => {
        const totalDecided = stats.approved + stats.rejected;
        const approvalRate = totalDecided > 0 
          ? Math.round((stats.approved / totalDecided) * 100)
          : 0;
          
        return {
          name,
          count: stats.count,
          approved: stats.approved,
          rejected: stats.rejected,
          approvalRate
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 directories
    
    return res.json({
      fileTypes: fileTypesData,
      directories: directoriesData,
      timeRange
    });
  } catch (error) {
    log('error', 'api', 'Failed to get file stats', { error });
    return res.status(500).json({ error: 'Failed to get file statistics' });
  }
});

/**
 * GET /api/changes/history
 * Get change history time series data
 */
router.get('/changes/history', async (req: Request, res: Response) => {
  try {
    const timeRange = req.query.timeRange as string || '7d';
    const { startDate, endDate } = getDateRange(timeRange);
    
    // Get all changes
    const allChanges = await storage.getChanges();
    
    // Filter changes by date range
    const filteredChanges = allChanges.filter(change => {
      const changeDate = new Date(change.createdAt);
      return changeDate >= startDate && changeDate <= endDate;
    });
    
    // Group by date
    const groupedChanges: Record<string, { 
      count: number, 
      submitted: number,
      approved: number,
      rejected: number, 
      pending: number 
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
        count: 0, 
        submitted: 0,
        approved: 0,
        rejected: 0,
        pending: 0 
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
          count: 0, 
          submitted: 0,
          approved: 0,
          rejected: 0,
          pending: 0 
        };
      }
      
      groupedChanges[dateKey].count++;
      groupedChanges[dateKey].submitted++;
      
      if (change.status === 'approved') {
        groupedChanges[dateKey].approved++;
      } else if (change.status === 'rejected') {
        groupedChanges[dateKey].rejected++;
      } else if (change.status === 'pending') {
        groupedChanges[dateKey].pending++;
      }
    }
    
    // Convert to array for chart data
    const timeSeriesData = Object.entries(groupedChanges)
      .map(([date, stats]) => ({
        date,
        count: stats.count,
        submitted: stats.submitted,
        approved: stats.approved,
        rejected: stats.rejected,
        pending: stats.pending
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    return res.json({
      timeSeriesData,
      timeRange
    });
  } catch (error) {
    log('error', 'api', 'Failed to get change history', { error });
    return res.status(500).json({ error: 'Failed to get change history' });
  }
});

export default router;