(() => {
  "use strict";
  const STORE_KEY = "studysync_v1";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const todayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  };
  const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2,8)}`;
  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const dateObj = value => { const [y,m,d] = String(value || "").split("-").map(Number); return y && m && d ? new Date(y,m-1,d) : null; };
  const fmtDate = value => { const d = dateObj(value); return d ? d.toLocaleDateString(undefined,{day:"numeric",month:"short",year:"numeric"}) : "No date"; };
  const shortDate = value => { const d = dateObj(value); return d ? {day:d.getDate(),month:d.toLocaleDateString(undefined,{month:"short"})} : {day:"—",month:"—"}; };
  const dayDiff = value => { const d = dateObj(value); if(!d)return null; const now=dateObj(todayISO()); return Math.round((d-now)/86400000); };
  const emptyState = (icon, message) => `<div class="empty-block"><span>${icon}</span>${esc(message)}</div>`;
  const defaultData = () => ({profile:{name:"Student",dark:false},tasks:[],assignments:[],notes:[],exams:[],focusSessions:[],activity:[],streak:{lastDate:"",days:0}});
  let data = loadData();
  let taskFilter = "all", assignmentFilter = "all", timerMode = "focus", timerRunning = false, timerEnd = 0, timerRemaining = 25*60, timerInterval = null, modalAction = null;

  function loadData(){
    try {
      const parsed = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
      if(!parsed || typeof parsed !== "object") return defaultData();
      const d = {...defaultData(),...parsed};
      d.profile = {...defaultData().profile,...(parsed.profile || {})};
      for(const key of ["tasks","assignments","notes","exams","focusSessions","activity"]) if(!Array.isArray(d[key])) d[key]=[];
      d.streak = {...defaultData().streak,...(parsed.streak || {})};
      return d;
    } catch { return defaultData(); }
  }
  function save(){ try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch { toast("Your browser could not save data. Check storage settings.","error"); } }
  function toast(message,type="success"){ const el=document.createElement("div");el.className=`toast ${type}`;el.textContent=message;$("#toastRegion").append(el);setTimeout(()=>el.remove(),3400); }
  function confirmAction(title,message,action,label="Continue"){ $("#modalTitle").textContent=title;$("#modalMessage").textContent=message;$("#modalConfirm").textContent=label;$("#confirmModal").classList.remove("hidden");modalAction=action; }
  function closeModal(){ $("#confirmModal").classList.add("hidden");modalAction=null; }
  function addActivity(type,text){ data.activity.unshift({id:uid(),type,text,date:new Date().toISOString()});data.activity=data.activity.slice(0,40); }
  function touchStreak(){
    const today=todayISO(), last=data.streak.lastDate;
    if(last===today)return;
    if(last){const diff=dayDiff(last);data.streak.days=diff===1?data.streak.days+1:1;}else data.streak.days=1;
    data.streak.lastDate=today;
  }
  function switchPage(name){
    const page=$(`#page-${name}`);if(!page)return;
    $$(".page").forEach(p=>p.classList.toggle("active",p===page));
    $$(".nav-item[data-page]").forEach(b=>b.classList.toggle("active",b.dataset.page===name));
    $("#pageTitle").textContent=({dashboard:"Dashboard",planner:"Study Planner",assignments:"Assignments",notes:"Notes",exams:"Exam Countdown",focus:"Focus Timer",progress:"Progress",settings:"Settings"})[name]||"Dashboard";
    $("#sidebar").classList.remove("open");window.scrollTo({top:0,behavior:"smooth"});
    if(name==="dashboard")renderDashboard();if(name==="planner")renderPlanner();if(name==="assignments")renderAssignments();if(name==="notes")renderNotes();if(name==="exams")renderExams();if(name==="progress")renderProgress();if(name==="focus")renderFocusSummary();
  }
  function setTheme(dark){data.profile.dark=!!dark;document.body.classList.toggle("dark",data.profile.dark);$("#themeToggle").textContent=dark?"☀":"☾";$("#settingsTheme").setAttribute("aria-checked",String(dark));save();}
  function updateProfileUI(){const name=data.profile.name||"Student";$("#sidebarName").textContent=name;const initials=name.trim().split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase()||"ST";$("#avatarInitials").textContent=initials;$("#topAvatar").textContent=initials;$("#profileName").value=name;}
  function renderTop(){const d=new Date();$("#todayLabel").textContent=d.toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric"});updateProfileUI();setTheme(data.profile.dark);}
  function renderDashboard(){
    const tasksToday=data.tasks.filter(t=>t.date===todayISO()&&!t.completed).sort((a,b)=>(a.time||"").localeCompare(b.time||"")).slice(0,5);
    const completed=data.tasks.filter(t=>t.completed).length;
    const pending=data.assignments.filter(a=>a.status!=="completed").length;
    const todayMinutes=data.focusSessions.filter(s=>s.date===todayISO()).reduce((sum,s)=>sum+s.minutes,0);
    $("#statCompleted").textContent=completed;$("#statMinutes").textContent=data.focusSessions.reduce((sum,s)=>sum+s.minutes,0);$("#statPending").textContent=pending;$("#statStreak").textContent=data.streak.days;
    $("#assignmentFoot").textContent=pending===0?"You're all caught up!":`${data.assignments.filter(a=>a.status!=="completed"&&dayDiff(a.dueDate)<0).length} overdue`;
    $("#heroGreeting").textContent=`Ready to make progress, ${(data.profile.name||"Student").split(" ")[0]}?`;
    $("#heroMessage").textContent=tasksToday.length?`You have ${tasksToday.length} task${tasksToday.length===1?"":"s"} planned for today. Start with the first one.`:"Choose one meaningful task and get started.";
    $("#todayTasks").innerHTML=tasksToday.length?tasksToday.map(t=>`<div class="task-row"><button class="task-check" data-complete-task="${t.id}" aria-label="Complete ${esc(t.title)}"></button><div class="task-main"><strong>${esc(t.title)}</strong><small>${esc(t.subject)} · ${Number(t.duration)||30} min</small></div><div class="task-meta">${t.time?esc(t.time):"Anytime"}</div></div>`).join(""):emptyState("✦","No study tasks planned for today.");
    const upcoming=data.assignments.filter(a=>a.status!=="completed").sort((a,b)=>a.dueDate.localeCompare(b.dueDate)).slice(0,3);
    $("#upcomingAssignments").innerHTML=upcoming.length?upcoming.map(a=>{const diff=dayDiff(a.dueDate),s=shortDate(a.dueDate);return `<div class="deadline-item"><div class="date-box"><strong>${s.day}</strong><small>${s.month}</small></div><div class="deadline-copy"><strong>${esc(a.title)}</strong><small>${esc(a.subject)} · ${diff<0?`${Math.abs(diff)} day(s) overdue`:diff===0?"Due today":`Due in ${diff} day(s)`}</small></div><span class="status-label ${diff<0?"status-overdue":"status-pending"}">${diff<0?"Overdue":diff===0?"Today":"Upcoming"}</span></div>`}).join(""):emptyState("☑","No pending assignments. Nice work!");
    const next=data.exams.filter(e=>dayDiff(e.date)>=0).sort((a,b)=>a.date.localeCompare(b.date))[0];
    $("#nextExamWidget").innerHTML=next?`<span>◉</span><div class="exam-days">${dayDiff(next.date)===0?"Today":dayDiff(next.date)} <small>${dayDiff(next.date)===0?"is the day":"days to go"}</small></div><strong>${esc(next.title)}</strong><p>${fmtDate(next.date)}${next.time?" · "+esc(next.time):""}</p><button class="small-button" data-page="exams">View exam →</button>`:`<span>◉</span><p>No upcoming exams added.</p><button class="small-button" data-page="exams">Add an exam</button>`;
    renderFocusSummary();
  }
  function renderPlanner(){
    const query=($("#taskSearch").value||"").trim().toLowerCase();
    let list=[...data.tasks].filter(t=>{const match=(t.title+" "+t.subject).toLowerCase().includes(query);const f=taskFilter==="today"?t.date===todayISO():taskFilter==="pending"?!t.completed:taskFilter==="completed"?t.completed:true;return match&&f;});
    list.sort((a,b)=>(a.date||"").localeCompare(b.date||"")||(a.time||"").localeCompare(b.time||""));
    $("#taskCount").textContent=`${list.length} task${list.length===1?"":"s"} · ${data.tasks.filter(t=>!t.completed).length} pending`;
    $("#plannerList").innerHTML=list.length?list.map(t=>`<div class="data-row"><button class="task-check ${t.completed?"checked":""}" data-complete-task="${t.id}" aria-label="${t.completed?"Reopen":"Complete"} ${esc(t.title)}">${t.completed?"✓":""}</button><div class="data-row-main"><strong class="${t.completed?"completed-text":""}">${esc(t.title)}</strong><p>${esc(t.subject)} · ${fmtDate(t.date)}${t.time?" at "+esc(t.time):""} · ${Number(t.duration)||30} minutes</p></div><span class="priority priority-${t.priority.toLowerCase()}">${esc(t.priority)}</span><div class="row-actions"><button class="tiny-button" data-edit-task="${t.id}">Edit</button><button class="tiny-button delete" data-delete-task="${t.id}">Delete</button></div></div>`).join(""):emptyState("◷","No tasks match this view. Add a task to build your plan.");
  }
  function renderAssignments(){
    const q=($("#assignmentSearch").value||"").trim().toLowerCase();
    let list=[...data.assignments].filter(a=>{const diff=dayDiff(a.dueDate);const overdue=a.status!=="completed"&&diff<0;const filter=assignmentFilter==="pending"?a.status!=="completed":assignmentFilter==="completed"?a.status==="completed":assignmentFilter==="overdue"?overdue:true;return filter&&(a.title+" "+a.subject+" "+(a.details||"")).toLowerCase().includes(q);});
    list.sort((a,b)=>a.dueDate.localeCompare(b.dueDate));
    $("#assignmentList").innerHTML=list.length?list.map(a=>{const diff=dayDiff(a.dueDate),overdue=a.status!=="completed"&&diff<0;return `<div class="data-row"><div class="date-box"><strong>${shortDate(a.dueDate).day}</strong><small>${shortDate(a.dueDate).month}</small></div><div class="data-row-main"><strong class="${a.status==="completed"?"completed-text":""}">${esc(a.title)}</strong><p>${esc(a.subject)} · Due ${fmtDate(a.dueDate)}${a.details?" · "+esc(a.details):""}</p></div><span class="status-label ${a.status==="completed"?"status-completed":overdue?"status-overdue":"status-pending"}">${a.status==="completed"?"Completed":overdue?"Overdue":"Pending"}</span><div class="row-actions"><button class="tiny-button" data-toggle-assignment="${a.id}">${a.status==="completed"?"Reopen":"Complete"}</button><button class="tiny-button" data-edit-assignment="${a.id}">Edit</button><button class="tiny-button delete" data-delete-assignment="${a.id}">Delete</button></div></div>`;}).join(""):emptyState("☑","No assignments match this view.");
  }
  function renderNotes(){
    const q=($("#noteSearch").value||"").trim().toLowerCase();
    const list=[...data.notes].filter(n=>(n.title+" "+n.subject+" "+n.content).toLowerCase().includes(q)).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
    $("#noteCount").textContent=`${list.length} note${list.length===1?"":"s"}`;
    $("#notesGrid").innerHTML=list.length?list.map(n=>`<article class="note-card"><div class="note-top"><span class="subject-chip">${esc(n.subject)}</span><span class="result-count">${new Date(n.updatedAt).toLocaleDateString(undefined,{month:"short",day:"numeric"})}</span></div><h3>${esc(n.title)}</h3><p>${esc(n.content)}</p><div class="note-actions"><button class="tiny-button" data-copy-note="${n.id}">Copy</button><button class="tiny-button" data-edit-note="${n.id}">Edit</button><button class="tiny-button delete" data-delete-note="${n.id}">Delete</button></div></article>`).join(""):emptyState("▤","Your notes library is empty. Create a note to save useful ideas.");
  }
  function renderExams(){
    const list=[...data.exams].sort((a,b)=>a.date.localeCompare(b.date));
    $("#examList").innerHTML=list.length?list.map(e=>{const diff=dayDiff(e.date);return `<article class="exam-card"><div class="exam-top"><span class="subject-chip">${esc(e.status)}</span><span class="result-count">${fmtDate(e.date)}</span></div><div class="exam-days">${diff===0?"Today":diff<0?"Passed":diff} <small>${diff===0?"is the day":diff<0?"days ago":"days to go"}</small></div><h3>${esc(e.title)}</h3><p>${e.time?`Exam time: ${esc(e.time)}`:"Add an exam time in edit settings if needed."}</p><div class="exam-actions"><button class="tiny-button" data-edit-exam="${e.id}">Edit</button><button class="tiny-button delete" data-delete-exam="${e.id}">Delete</button></div></article>`;}).join(""):emptyState("◉","No exams added yet. Add your next exam to start a countdown.");
  }
  function renderFocusSummary(){
    const sessions=data.focusSessions.filter(s=>s.date===todayISO()),minutes=sessions.reduce((sum,s)=>sum+s.minutes,0);
    $("#focusSessionCount").textContent=`${sessions.length} session${sessions.length===1?"":"s"}`;$("#focusMinutesToday").textContent=`${minutes} minutes completed today`;$("#focusProgressBar").style.width=`${Math.min(100,minutes)}%`;
  }
  function renderProgress(){
    $("#progressCompleted").textContent=data.tasks.filter(t=>t.completed).length;$("#progressMinutes").textContent=data.focusSessions.reduce((sum,s)=>sum+s.minutes,0);$("#progressNotes").textContent=data.notes.length;$("#progressExams").textContent=data.exams.filter(e=>dayDiff(e.date)>=0).length;
    const total=data.tasks.length,done=data.tasks.filter(t=>t.completed).length,pending=total-done;
    const groups=[["Completed",done],["Pending",pending]];
    $("#taskProgressChart").innerHTML=total?groups.map(([name,count])=>`<div class="bar-line"><span>${name}</span><div class="bar-track"><span style="width:${total?count/total*100:0}%"></span></div><strong>${count}</strong></div>`).join(""):emptyState("↗","Complete a task to see your progress.");
    const days=[];for(let i=6;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);const iso=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;days.push({iso,label:d.toLocaleDateString(undefined,{weekday:"short"}),minutes:data.focusSessions.filter(s=>s.date===iso).reduce((sum,s)=>sum+s.minutes,0)});}
    const max=Math.max(30,...days.map(d=>d.minutes));
    $("#weeklyChart").innerHTML=days.map(d=>`<div class="week-day"><strong>${d.minutes||0}</strong><div class="week-bar-wrap"><div class="week-bar" style="height:${d.minutes?Math.max(3,d.minutes/max*100):0}%"></div></div><small>${d.label}</small></div>`).join("");
    const activity=data.activity.slice(0,8);
    $("#recentActivity").innerHTML=activity.length?activity.map(a=>`<div class="data-row"><span class="stat-icon ${a.type==="focus"?"peach":a.type==="task"?"lilac":"mint"}">${a.type==="focus"?"◷":a.type==="task"?"✓":"✦"}</span><div class="data-row-main"><strong>${esc(a.text)}</strong><p>${new Date(a.date).toLocaleString()}</p></div></div>`).join(""):emptyState("✦","Your recent activity will appear here.");
  }
  function resetTaskForm(){ $("#taskForm").reset();$("#taskId").value="";$("#taskDate").value=todayISO();$("#taskDuration").value=30;$("#taskFormTitle").textContent="New study task"; }
  function openTaskForm(task=null){resetTaskForm();if(task){$("#taskId").value=task.id;$("#taskTitle").value=task.title;$("#taskSubject").value=task.subject;$("#taskDate").value=task.date;$("#taskTime").value=task.time||"";$("#taskDuration").value=task.duration;$("#taskPriority").value=task.priority;$("#taskFormTitle").textContent="Edit study task";}$("#taskForm").classList.remove("hidden");$("#taskForm").scrollIntoView({behavior:"smooth",block:"center"});$("#taskTitle").focus();}
  function resetAssignmentForm(){ $("#assignmentForm").reset();$("#assignmentId").value="";$("#assignmentDate").value=todayISO();$("#assignmentFormTitle").textContent="New assignment"; }
  function openAssignmentForm(item=null){resetAssignmentForm();if(item){$("#assignmentId").value=item.id;$("#assignmentTitle").value=item.title;$("#assignmentSubject").value=item.subject;$("#assignmentDate").value=item.dueDate;$("#assignmentStatus").value=item.status;$("#assignmentDetails").value=item.details||"";$("#assignmentFormTitle").textContent="Edit assignment";}$("#assignmentForm").classList.remove("hidden");$("#assignmentForm").scrollIntoView({behavior:"smooth",block:"center"});$("#assignmentTitle").focus();}
  function resetNoteForm(){ $("#noteForm").reset();$("#noteId").value="";$("#noteFormTitle").textContent="Create a note"; }
  function openNoteForm(item=null){resetNoteForm();if(item){$("#noteId").value=item.id;$("#noteTitle").value=item.title;$("#noteSubject").value=item.subject;$("#noteContent").value=item.content;$("#noteFormTitle").textContent="Edit note";}$("#noteForm").classList.remove("hidden");$("#noteForm").scrollIntoView({behavior:"smooth",block:"center"});$("#noteTitle").focus();}
  function resetExamForm(){ $("#examForm").reset();$("#examId").value="";$("#examDate").value=todayISO();$("#examFormTitle").textContent="Add an exam"; }
  function openExamForm(item=null){resetExamForm();if(item){$("#examId").value=item.id;$("#examTitle").value=item.title;$("#examDate").value=item.date;$("#examTime").value=item.time||"";$("#examStatus").value=item.status;$("#examFormTitle").textContent="Edit exam";}$("#examForm").classList.remove("hidden");$("#examForm").scrollIntoView({behavior:"smooth",block:"center"});$("#examTitle").focus();}
  function completeTask(id){const t=data.tasks.find(x=>x.id===id);if(!t)return;t.completed=!t.completed;t.completedAt=t.completed?new Date().toISOString():"";if(t.completed){touchStreak();addActivity("task",`Completed study task: ${t.title}`);toast("Task completed. Nice work!");}save();renderDashboard();renderPlanner();}
  function deleteItem(array,id,label,rerender){confirmAction(`Delete ${label}?`,`This ${label.toLowerCase()} will be removed from your workspace.`,()=>{const index=array.findIndex(x=>x.id===id);if(index>=0)array.splice(index,1);save();rerender();toast(`${label} deleted.`);});}
  function startTimer(){
    if(timerRunning){timerRunning=false;clearInterval(timerInterval);timerInterval=null;$("#timerStart").textContent="▶ Resume";return;}
    timerRunning=true;timerEnd=Date.now()+timerRemaining*1000;$("#timerStart").textContent="Ⅱ Pause";timerInterval=setInterval(tickTimer,250);tickTimer();
  }
  function tickTimer(){
    if(!timerRunning)return;timerRemaining=Math.max(0,Math.ceil((timerEnd-Date.now())/1000));updateTimerUI();
    if(timerRemaining<=0){clearInterval(timerInterval);timerInterval=null;timerRunning=false;const minutes=timerMode==="focus"?Number($("#focusMinutes").value):timerMode==="short"?Number($("#shortMinutes").value):Number($("#longMinutes").value);if(timerMode==="focus"){data.focusSessions.push({id:uid(),date:todayISO(),minutes,completedAt:new Date().toISOString()});touchStreak();addActivity("focus",`Completed a ${minutes}-minute focus session`);save();toast("Focus session complete! Take a well-earned break.");}else toast("Break finished. Ready to focus again?");timerRemaining=0;$("#timerStart").textContent="↻ Start again";renderFocusSummary();renderDashboard();renderProgress();updateTimerUI();}
  }
  function modeSeconds(mode){return (mode==="focus"?Number($("#focusMinutes").value):mode==="short"?Number($("#shortMinutes").value):Number($("#longMinutes").value))*60;}
  function setTimerMode(mode){timerMode=mode;if(timerInterval)clearInterval(timerInterval);timerInterval=null;timerRunning=false;timerRemaining=modeSeconds(mode);$$("[data-mode]").forEach(b=>b.classList.toggle("selected",b.dataset.mode===mode));$("#timerStart").textContent=mode==="focus"?"▶ Start focus":"▶ Start break";$("#timerLabel").textContent=mode==="focus"?"FOCUS TIME":mode==="short"?"SHORT BREAK":"LONG BREAK";$("#timerSubtext").textContent=mode==="focus"?"One thing at a time.":"Rest your mind for a moment.";updateTimerUI();}
  function updateTimerUI(){const m=Math.floor(timerRemaining/60),s=timerRemaining%60;$("#timerDisplay").textContent=`${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;const total=modeSeconds(timerMode),progress=total?((total-timerRemaining)/total):0;const degrees=Math.max(0,Math.min(360,progress*360));$("#timerRing").style.background=`conic-gradient(var(--magenta) 0deg,var(--purple) ${degrees}deg,#f0e7f4 ${degrees}deg)`;}
  function safeRenderAll(){renderDashboard();renderPlanner();renderAssignments();renderNotes();renderExams();renderProgress();renderFocusSummary();}

  document.addEventListener("click",e=>{
    const pageButton=e.target.closest("[data-page]");if(pageButton){e.preventDefault();switchPage(pageButton.dataset.page);return;}
    const close=e.target.closest("[data-close]");if(close){$(`#${close.dataset.close}`).classList.add("hidden");return;}
    const complete=e.target.closest("[data-complete-task]");if(complete){completeTask(complete.dataset.completeTask);return;}
    const editTask=e.target.closest("[data-edit-task]");if(editTask){openTaskForm(data.tasks.find(t=>t.id===editTask.dataset.editTask));return;}
    const deleteTask=e.target.closest("[data-delete-task]");if(deleteTask){deleteItem(data.tasks,deleteTask.dataset.deleteTask,"Task",()=>{renderPlanner();renderDashboard();});return;}
    const editAssignment=e.target.closest("[data-edit-assignment]");if(editAssignment){openAssignmentForm(data.assignments.find(a=>a.id===editAssignment.dataset.editAssignment));return;}
    const deleteAssignment=e.target.closest("[data-delete-assignment]");if(deleteAssignment){deleteItem(data.assignments,deleteAssignment.dataset.deleteAssignment,"Assignment",()=>{renderAssignments();renderDashboard();});return;}
    const toggleAssignment=e.target.closest("[data-toggle-assignment]");if(toggleAssignment){const a=data.assignments.find(x=>x.id===toggleAssignment.dataset.toggleAssignment);if(a){a.status=a.status==="completed"?"pending":"completed";if(a.status==="completed"){touchStreak();addActivity("task",`Completed assignment: ${a.title}`);}save();renderAssignments();renderDashboard();toast(a.status==="completed"?"Assignment marked complete.":"Assignment reopened.");}return;}
    const editNote=e.target.closest("[data-edit-note]");if(editNote){openNoteForm(data.notes.find(n=>n.id===editNote.dataset.editNote));return;}
    const deleteNote=e.target.closest("[data-delete-note]");if(deleteNote){deleteItem(data.notes,deleteNote.dataset.deleteNote,"Note",renderNotes);return;}
    const copyNote=e.target.closest("[data-copy-note]");if(copyNote){const n=data.notes.find(x=>x.id===copyNote.dataset.copyNote);if(n){const text=`${n.title}\n${n.subject}\n\n${n.content}`;if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(text).then(()=>toast("Note copied to clipboard.")).catch(()=>fallbackCopy(text));else fallbackCopy(text);}return;}
    const editExam=e.target.closest("[data-edit-exam]");if(editExam){openExamForm(data.exams.find(x=>x.id===editExam.dataset.editExam));return;}
    const deleteExam=e.target.closest("[data-delete-exam]");if(deleteExam){deleteItem(data.exams,deleteExam.dataset.deleteExam,"Exam",()=>{renderExams();renderDashboard();renderProgress();});return;}
    const filter=e.target.closest("[data-filter]");if(filter){const group=filter.closest("#taskFilters,#assignmentFilters");if(!group)return;$$("button",group).forEach(b=>b.classList.toggle("selected",b===filter));if(group.id==="taskFilters"){taskFilter=filter.dataset.filter;renderPlanner();}else{assignmentFilter=filter.dataset.filter;renderAssignments();}return;}
    const mode=e.target.closest("[data-mode]");if(mode){setTimerMode(mode.dataset.mode);return;}
  });
  function fallbackCopy(text){const area=document.createElement("textarea");area.value=text;area.style.position="fixed";area.style.opacity="0";document.body.append(area);area.select();try{document.execCommand("copy");toast("Note copied to clipboard.");}catch{toast("Copy failed. Select and copy the note manually.","error");}area.remove();}

  $("#showTaskForm").addEventListener("click",()=>openTaskForm());
  $("#showAssignmentForm").addEventListener("click",()=>openAssignmentForm());
  $("#showNoteForm").addEventListener("click",()=>openNoteForm());
  $("#showExamForm").addEventListener("click",()=>openExamForm());
  $("#taskForm").addEventListener("submit",e=>{e.preventDefault();const id=$("#taskId").value;const existing=data.tasks.find(t=>t.id===id);const item={id:id||uid(),title:$("#taskTitle").value.trim(),subject:$("#taskSubject").value.trim(),date:$("#taskDate").value,time:$("#taskTime").value,duration:Math.max(5,Math.min(600,Number($("#taskDuration").value)||30)),priority:$("#taskPriority").value,completed:existing?.completed||false,completedAt:existing?.completedAt||""};if(!item.title||!item.subject||!item.date)return toast("Please complete the required fields.","error");if(existing)Object.assign(existing,item);else data.tasks.push(item);save();$("#taskForm").classList.add("hidden");resetTaskForm();renderPlanner();renderDashboard();toast(existing?"Task updated.":"Study task added.");});
  $("#assignmentForm").addEventListener("submit",e=>{e.preventDefault();const id=$("#assignmentId").value;const existing=data.assignments.find(a=>a.id===id);const item={id:id||uid(),title:$("#assignmentTitle").value.trim(),subject:$("#assignmentSubject").value.trim(),dueDate:$("#assignmentDate").value,status:$("#assignmentStatus").value,details:$("#assignmentDetails").value.trim()};if(!item.title||!item.subject||!item.dueDate)return toast("Please complete the required fields.","error");if(existing)Object.assign(existing,item);else data.assignments.push(item);save();$("#assignmentForm").classList.add("hidden");resetAssignmentForm();renderAssignments();renderDashboard();renderProgress();toast(existing?"Assignment updated.":"Assignment added.");});
  $("#noteForm").addEventListener("submit",e=>{e.preventDefault();const id=$("#noteId").value;const existing=data.notes.find(n=>n.id===id);const now=new Date().toISOString();const item={id:id||uid(),title:$("#noteTitle").value.trim(),subject:$("#noteSubject").value.trim(),content:$("#noteContent").value.trim(),updatedAt:now};if(!item.title||!item.subject||!item.content)return toast("Please complete the required fields.","error");if(existing)Object.assign(existing,item);else data.notes.push(item);save();$("#noteForm").classList.add("hidden");resetNoteForm();renderNotes();renderProgress();toast(existing?"Note updated.":"Note saved.");});
  $("#examForm").addEventListener("submit",e=>{e.preventDefault();const id=$("#examId").value;const existing=data.exams.find(x=>x.id===id);const item={id:id||uid(),title:$("#examTitle").value.trim(),date:$("#examDate").value,time:$("#examTime").value,status:$("#examStatus").value};if(!item.title||!item.date)return toast("Please complete the required fields.","error");if(existing)Object.assign(existing,item);else data.exams.push(item);save();$("#examForm").classList.add("hidden");resetExamForm();renderExams();renderDashboard();renderProgress();toast(existing?"Exam updated.":"Exam added.");});
  $("#taskSearch").addEventListener("input",renderPlanner);$("#assignmentSearch").addEventListener("input",renderAssignments);$("#noteSearch").addEventListener("input",renderNotes);
  $("#themeToggle").addEventListener("click",()=>setTheme(!data.profile.dark));$("#settingsTheme").addEventListener("click",()=>setTheme(!data.profile.dark));
  $("#profileForm").addEventListener("submit",e=>{e.preventDefault();const name=$("#profileName").value.trim();if(!name)return toast("Please enter your name.","error");data.profile.name=name;save();updateProfileUI();renderDashboard();toast("Profile saved.");});
  $("#mobileMenu").addEventListener("click",()=>$("#sidebar").classList.toggle("open"));
  $("#timerStart").addEventListener("click",startTimer);
  $("#timerReset").addEventListener("click",()=>{if(timerInterval)clearInterval(timerInterval);timerInterval=null;timerRunning=false;timerRemaining=modeSeconds(timerMode);$("#timerStart").textContent=timerMode==="focus"?"▶ Start focus":"▶ Start break";updateTimerUI();});
  ["focusMinutes","shortMinutes","longMinutes"].forEach(id=>$("#"+id).addEventListener("change",()=>{if(!timerRunning){timerRemaining=modeSeconds(timerMode);updateTimerUI();}}));
  $("#modalCancel").addEventListener("click",closeModal);$("#confirmModal").addEventListener("click",e=>{if(e.target===$("#confirmModal"))closeModal();});$("#modalConfirm").addEventListener("click",()=>{const action=modalAction;closeModal();if(action)action();});
  $("#resetAll").addEventListener("click",()=>confirmAction("Reset all StudySync data?","This permanently deletes your tasks, assignments, notes, exams, and focus history from this browser.",()=>{if(timerInterval)clearInterval(timerInterval);data=defaultData();save();safeRenderAll();renderTop();resetTaskForm();resetAssignmentForm();resetNoteForm();resetExamForm();setTimerMode("focus");switchPage("dashboard");toast("Workspace reset. Start fresh!");},"Reset data"));
  document.addEventListener("keydown",e=>{if(e.key==="Escape"){closeModal();$("#sidebar").classList.remove("open");}});
  $("#taskDate").value=todayISO();$("#assignmentDate").value=todayISO();$("#examDate").value=todayISO();
  renderTop();safeRenderAll();setTimerMode("focus");
})();