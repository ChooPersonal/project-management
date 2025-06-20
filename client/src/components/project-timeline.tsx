import { format, isAfter, isBefore, isToday, parseISO, differenceInDays, startOfDay, endOfDay } from "date-fns";
import { Calendar, Clock, Play, CheckCircle, AlertCircle, Pause } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, getStatusColor, getPriorityColor } from "@/lib/utils";
import type { Project } from "@/types";

interface ProjectTimelineProps {
  projects: Project[];
}

interface TimelineProject extends Project {
  startDateParsed: Date | null;
  dueDateParsed: Date | null;
  duration: number;
  isActive: boolean;
  isOverdue: boolean;
  daysRemaining: number;
}

export default function ProjectTimeline({ projects }: ProjectTimelineProps) {
  // Process projects with timeline data
  const timelineProjects: TimelineProject[] = projects
    .map(project => {
      const startDateParsed = project.startDate ? parseISO(project.startDate) : null;
      const dueDateParsed = project.dueDate ? parseISO(project.dueDate) : null;
      const today = new Date();
      
      const duration = startDateParsed && dueDateParsed 
        ? differenceInDays(dueDateParsed, startDateParsed) + 1 
        : 0;
      
      const isActive = startDateParsed && dueDateParsed
        ? !isBefore(today, startOfDay(startDateParsed)) && !isAfter(today, endOfDay(dueDateParsed))
        : false;
      
      const isOverdue = dueDateParsed ? isAfter(today, endOfDay(dueDateParsed)) && project.status !== 'completed' : false;
      
      const daysRemaining = dueDateParsed ? differenceInDays(dueDateParsed, today) : 0;

      return {
        ...project,
        startDateParsed,
        dueDateParsed,
        duration,
        isActive,
        isOverdue,
        daysRemaining
      };
    })
    .filter(project => project.startDateParsed && project.dueDateParsed)
    .sort((a, b) => {
      if (!a.startDateParsed || !b.startDateParsed) return 0;
      return a.startDateParsed.getTime() - b.startDateParsed.getTime();
    });

  const getStatusIcon = (project: TimelineProject) => {
    if (project.status === 'completed') return <CheckCircle className="w-4 h-4" />;
    if (project.isOverdue) return <AlertCircle className="w-4 h-4" />;
    if (project.isActive) return <Play className="w-4 h-4" />;
    if (project.status === 'in-progress') return <Play className="w-4 h-4" />;
    return <Pause className="w-4 h-4" />;
  };

  const getTimelineBarWidth = (project: TimelineProject) => {
    if (!project.startDateParsed || !project.dueDateParsed) return '0%';
    
    const today = new Date();
    const totalDuration = project.duration;
    
    if (project.status === 'completed') return '100%';
    if (isBefore(today, project.startDateParsed)) return '0%';
    if (isAfter(today, project.dueDateParsed)) return '100%';
    
    const elapsed = differenceInDays(today, project.startDateParsed) + 1;
    const progress = Math.max(0, Math.min(100, (elapsed / totalDuration) * 100));
    return `${progress}%`;
  };

  const activeProjects = timelineProjects.filter(p => p.isActive);
  const upcomingProjects = timelineProjects.filter(p => p.startDateParsed && isBefore(new Date(), p.startDateParsed));
  const overdueProjects = timelineProjects.filter(p => p.isOverdue);

  return (
    <div className="space-y-6">
      {/* Current Running Projects */}
      {activeProjects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="w-5 h-5 text-green-600" />
              Currently Running Projects
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeProjects.map((project) => (
              <div key={project.id} className="p-4 border rounded-lg bg-green-50 dark:bg-green-950/20">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(project)}
                    <h3 className="font-semibold">{project.title}</h3>
                    <Badge variant="outline" className={cn("text-xs", getStatusColor(project.status))}>
                      {project.status}
                    </Badge>
                    <Badge variant="outline" className={cn("text-xs", getPriorityColor(project.priority))}>
                      {project.priority}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {project.daysRemaining > 0 ? `${project.daysRemaining} days left` : 'Due today'}
                  </div>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {project.startDateParsed && format(project.startDateParsed, 'MMM dd')} - {project.dueDateParsed && format(project.dueDateParsed, 'MMM dd, yyyy')}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {project.duration} days
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: getTimelineBarWidth(project) }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Overdue Projects */}
      {overdueProjects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              Overdue Projects
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {overdueProjects.map((project) => (
              <div key={project.id} className="p-4 border rounded-lg bg-red-50 dark:bg-red-950/20">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(project)}
                    <h3 className="font-semibold">{project.title}</h3>
                    <Badge variant="outline" className={cn("text-xs", getStatusColor(project.status))}>
                      {project.status}
                    </Badge>
                    <Badge variant="outline" className={cn("text-xs", getPriorityColor(project.priority))}>
                      {project.priority}
                    </Badge>
                  </div>
                  <div className="text-sm text-red-600 font-medium">
                    {Math.abs(project.daysRemaining)} days overdue
                  </div>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {project.startDateParsed && format(project.startDateParsed, 'MMM dd')} - {project.dueDateParsed && format(project.dueDateParsed, 'MMM dd, yyyy')}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {project.duration} days
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-red-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* All Projects Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Project Timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {timelineProjects.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No projects with dates found. Add start and due dates to projects to see them in the timeline.
            </div>
          ) : (
            timelineProjects.map((project) => (
              <div key={project.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(project)}
                    <h3 className="font-semibold">{project.title}</h3>
                    <Badge variant="outline" className={cn("text-xs", getStatusColor(project.status))}>
                      {project.status}
                    </Badge>
                    <Badge variant="outline" className={cn("text-xs", getPriorityColor(project.priority))}>
                      {project.priority}
                    </Badge>
                    {project.isActive && (
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        Active
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {project.isOverdue ? (
                      <span className="text-red-600 font-medium">{Math.abs(project.daysRemaining)} days overdue</span>
                    ) : project.daysRemaining > 0 ? (
                      <span>{project.daysRemaining} days remaining</span>
                    ) : project.daysRemaining === 0 ? (
                      <span className="text-orange-600 font-medium">Due today</span>
                    ) : (
                      <span>Not started</span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {project.startDateParsed && format(project.startDateParsed, 'MMM dd')} - {project.dueDateParsed && format(project.dueDateParsed, 'MMM dd, yyyy')}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {project.duration} days
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className={cn(
                      "h-2 rounded-full transition-all duration-300",
                      project.isOverdue ? "bg-red-600" : 
                      project.isActive ? "bg-green-600" : 
                      project.status === 'completed' ? "bg-blue-600" : "bg-gray-400"
                    )}
                    style={{ width: getTimelineBarWidth(project) }}
                  />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Upcoming Projects */}
      {upcomingProjects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Upcoming Projects
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {upcomingProjects.map((project) => (
              <div key={project.id} className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(project)}
                    <h3 className="font-semibold">{project.title}</h3>
                    <Badge variant="outline" className={cn("text-xs", getStatusColor(project.status))}>
                      {project.status}
                    </Badge>
                    <Badge variant="outline" className={cn("text-xs", getPriorityColor(project.priority))}>
                      {project.priority}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Starts in {differenceInDays(project.startDateParsed!, new Date())} days
                  </div>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {project.startDateParsed && format(project.startDateParsed, 'MMM dd')} - {project.dueDateParsed && format(project.dueDateParsed, 'MMM dd, yyyy')}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {project.duration} days
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}