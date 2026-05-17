import { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useTasksStore } from '@/store/tasksStore';
import { LogOut, Plus, Search, User, Loader2, ArrowRight, LayoutGrid, Columns, Tag, Menu, X, Pin, Star } from 'lucide-react';
import { CreateTaskModal } from '@/components/CreateTaskModal';
import { TaskDetailsModal } from '@/components/TaskDetailsModal';
import { KanbanBoard } from '@/components/KanbanBoard';
import { Footer } from '@/components/Footer';
import { SyncStatus } from '@/components/SyncStatus';
import type { Task } from '@/types';
import { useAISuggestions } from '@/hooks/useAISuggestions';
import { AISuggestions } from '@/components/AISuggestions';
import { useSyncEngine } from '@/hooks/useSyncEngine';

export default function Dashboard() {
    const { user, logout } = useAuthStore();
    const { tasks, fetchTasks, hydrateFromCache, isLoading, viewMode, setViewMode, selectedCategory, setSelectedCategory } = useTasksStore();
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const [activeTab, setActiveTab] = useState('All Tasks');

    const searchAI = useAISuggestions('search', searchQuery);

    useSyncEngine();

    useEffect(() => {
        hydrateFromCache().then(() => fetchTasks());

        const interval = setInterval(() => {
            fetchTasks(true);
        }, 60000);

        return () => clearInterval(interval);
    }, [fetchTasks, hydrateFromCache]);

    const categories = useMemo(() => {
        const cats = new Set<string>();
        tasks.forEach(t => t.categories.forEach(c => cats.add(c)));
        return Array.from(cats);
    }, [tasks]);

    const filteredTasks = useMemo(() => {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        return tasks.filter(t => {
            // Tab Filtering
            if (activeTab === 'Today' && t.dueDate !== todayStr) return false;
            if (activeTab === 'Upcoming' && (!t.dueDate || t.dueDate <= todayStr)) return false;
            if (activeTab === 'Completed' && t.status !== 'completed') return false;

            // Category & Search Filtering
            const matchesCategory = selectedCategory ? t.categories.includes(selectedCategory) : true;
            const matchesSearch = t.taskTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.description.toLowerCase().includes(searchQuery.toLowerCase());

            return matchesCategory && matchesSearch;
        });
    }, [tasks, selectedCategory, searchQuery, activeTab]);

    return (
        <div className="flex h-screen bg-black text-white overflow-hidden font-sans relative">
            {/* Background Effects matching Landing/Login */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full mix-blend-screen filter blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full mix-blend-screen filter blur-[120px] animate-pulse delay-700"></div>
            </div>

            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`fixed md:relative inset-y-0 left-0 bg-black md:bg-white/[0.02] backdrop-blur-3xl border-r border-white/5 flex flex-col z-50 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0 w-72' : '-translate-x-full md:translate-x-0 w-0 border-r-0 overflow-hidden'}`}>
                <div className="p-8 flex items-center justify-between">
                    <div className="flex items-center gap-3 group cursor-pointer" onClick={() => setActiveTab('All Tasks')}>
                        <img src="/logo.svg" alt="CloudTodo Logo" className="w-8 h-8 group-hover:rotate-12 transition-transform duration-300" />
                        <span className="text-2xl font-bold tracking-tighter bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent uppercase">
                            CloudTodo
                        </span>
                    </div>
                    <button
                        className="p-2 text-gray-400 hover:text-white transition-colors"
                        onClick={() => setIsSidebarOpen(false)}
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <nav className="flex-1 px-6 space-y-6">
                    <CreateTaskModal />

                    <div className="space-y-1">
                        <p className="px-4 text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-4">
                            Views
                        </p>
                        {['All Tasks', 'Today', 'Upcoming', 'Completed'].map((item) => (
                            <button
                                key={item}
                                onClick={() => {
                                    setActiveTab(item);
                                    setIsSidebarOpen(false);
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === item
                                    ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                                    }`}
                            >
                                <span className="font-medium">{item}</span>
                            </button>
                        ))}
                    </div>
                </nav>

                <div className="p-6 border-t border-white/5">
                    <div className="flex items-center gap-3 px-4 py-4 rounded-2xl bg-white/[0.03] border border-white/5 shadow-inner">
                        {user?.picture ? (
                            <img src={user.picture} alt={user.name} className="w-10 h-10 rounded-full border border-white/10" />
                        ) : (
                            <User className="w-10 h-10 p-2 rounded-full bg-indigo-500/20 text-indigo-400" />
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold truncate text-white">{user?.name}</p>
                            <p className="text-[11px] text-gray-500 truncate">{user?.email}</p>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        className="flex items-center gap-2 mt-6 ml-4 text-xs font-semibold text-gray-500 hover:text-red-400 transition-colors uppercase tracking-widest"
                    >
                        <LogOut className="w-3.5 h-3.5" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 bg-transparent relative z-10 w-full overflow-hidden">
                {/* Header */}
                <header className="h-20 border-b border-white/5 flex items-center justify-between px-4 md:px-10 bg-black/20 backdrop-blur-md">
                    <div className="flex items-center gap-4 flex-1">
                        <button
                            className={`p-2 text-gray-400 hover:text-white transition-colors ${isSidebarOpen ? 'md:hidden' : ''}`}
                            onClick={() => setIsSidebarOpen(true)}
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                        <div className="relative w-full max-w-sm group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
                            <input
                                type="text"
                                placeholder="Search tasks..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-white/[0.03] border border-white/5 rounded-2xl pl-12 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/40 transition-all placeholder:text-gray-600 text-gray-200"
                            />
                            <AISuggestions suggestions={searchAI.suggestions} isLoading={searchAI.isLoading} showSuggestions={searchAI.showSuggestions} onSelect={setSearchQuery} onDismiss={searchAI.dismiss} />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 bg-white/[0.03] p-1 rounded-2xl border border-white/5 ml-2">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-gray-500 hover:text-white'}`}
                        >
                            <LayoutGrid className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setViewMode('kanban')}
                            className={`p-2 rounded-xl transition-all ${viewMode === 'kanban' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-gray-500 hover:text-white'}`}
                        >
                            <Columns className="w-5 h-5" />
                        </button>
                    </div>
                    <SyncStatus />
                </header>

                {/* Content */}
                <div className="flex-1 overflow-auto p-6 md:p-10 pt-12 custom-scrollbar">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-8">
                            <div>
                                <h2 className="text-3xl md:text-4xl font-black text-white mb-3 tracking-tight">
                                    {activeTab}
                                </h2>
                                <p className="text-gray-400 text-lg font-medium">Hello, {user?.name?.split(' ')[0]}. Here's your recap.</p>
                            </div>

                            {/* Category Filter */}
                            <div className="flex flex-wrap gap-2 max-w-md md:justify-end">
                                <button
                                    onClick={() => setSelectedCategory(null)}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest border transition-all ${!selectedCategory ? 'bg-white text-black border-white' : 'border-white/10 text-gray-500 hover:border-white/20'}`}
                                >
                                    All
                                </button>
                                {categories.map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setSelectedCategory(cat)}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest border transition-all ${selectedCategory === cat ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-white/10 text-gray-500 hover:border-white/20'}`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-32 gap-4">
                                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                                <div className="text-gray-500 font-medium animate-pulse">Syncing with Drive...</div>
                            </div>
                        ) : tasks.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-32 text-center border-2 border-dashed border-white/5 rounded-[2.5rem] bg-white/[0.01]">
                                <div className="w-20 h-20 bg-white/[0.03] rounded-3xl flex items-center justify-center mb-6 border border-white/5">
                                    <Plus className="w-10 h-10 text-indigo-500" />
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-2">Clean slate</h3>
                                <p className="text-gray-500 max-w-sm mb-8">Ready to start organizing your tasks? Create your first one above.</p>
                            </div>
                        ) : viewMode === 'kanban' ? (
                            <KanbanBoard tasks={filteredTasks} onTaskClick={setSelectedTask} />
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-12">
                                {filteredTasks.map((task) => (
                                    <div
                                        key={task.id}
                                        onClick={() => setSelectedTask(task)}
                                        className="p-8 bg-white/[0.02] border border-white/5 rounded-[2rem] hover:border-indigo-500/30 transition-all hover:shadow-2xl hover:shadow-indigo-500/5 group cursor-pointer backdrop-blur-sm"
                                    >
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="flex items-center gap-2">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${task.priority === 1 ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                                    task.priority === 2 ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                                                        'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                                    }`}>
                                                    {task.priority === 1 ? 'High' : task.priority === 2 ? 'Med' : 'Low'}
                                                </span>
                                                {task.isPinned && <Pin className="w-3.5 h-3.5 text-blue-400 fill-blue-400/20" />}
                                                {task.isStarred && <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500/20" />}
                                                <User className="w-3.5 h-3.5 text-gray-500" />
                                            </div>
                                            <span className="text-[11px] font-medium text-gray-500">{task.dueDate || 'No date'}</span>
                                        </div>
                                        <h3 className="font-bold text-xl mb-3 group-hover:text-indigo-400 transition-colors leading-tight">{task.taskTitle}</h3>
                                        <p className="text-gray-500 text-sm line-clamp-2 leading-relaxed mb-6">{task.description}</p>

                                        <div className="flex flex-wrap gap-2 mb-6">
                                            {task.categories.map(cat => (
                                                <span key={cat} className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white/5 text-[10px] font-bold text-indigo-400 border border-indigo-500/10">
                                                    <Tag className="w-2.5 h-2.5" />
                                                    {cat}
                                                </span>
                                            ))}
                                        </div>

                                        <div className="flex items-center justify-between mt-auto pt-6 border-t border-white/5">
                                            <div className="flex -space-x-2">
                                                <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-bold text-gray-500">
                                                    {task.status.charAt(0).toUpperCase()}
                                                </div>
                                            </div>
                                            <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <Footer />
                </div>
            </main>

            <TaskDetailsModal
                task={selectedTask}
                onClose={() => setSelectedTask(null)}
            />
        </div>
    );
}
