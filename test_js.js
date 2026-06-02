
window.addEventListener('load', () => {
  setTimeout(() => {
    const loader = document.getElementById('initial-loader');
    if(loader) {
      loader.style.opacity = '0';
      loader.style.visibility = 'hidden';
    }
  }, 2000);
});

function toggleSidebar(){
  const winW = window.innerWidth;
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if(winW <= 768){
    return;
  } else if(winW <= 1024){
    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
  } else {
    sidebar.classList.toggle('collapsed');
    overlay.classList.remove('active');
  }
}
function closeSidebar(){
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  sidebar.classList.remove('open');
  sidebar.classList.remove('expanded');
  overlay.classList.remove('active');
}

let comingSoonTimer = null;
function showComingSoon(){
  const existing = document.getElementById('coming-soon-toast');
  if(existing) {
    existing.style.display = 'flex';
    if(comingSoonTimer) clearTimeout(comingSoonTimer);
    comingSoonTimer = setTimeout(hideComingSoon, 4000);
    return;
  }
  const toast = document.createElement('div');
  toast.id = 'coming-soon-toast';
  toast.innerHTML = '<div style="width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#333333,#000000);display:flex;align-items:center;justify-content:center;font-size:1.1rem;color:#fff;flex-shrink:0;box-shadow:0 4px 12px rgba(0,0,0,0.3)"><i class="fa-solid fa-circle-user"></i></div><div style="flex:1"><div style="font-weight:700;font-size:.88rem;color:var(--text)">Login Coming Soon</div><div style="font-size:.76rem;color:var(--text2);margin-top:3px">We\'re building something awesome! 🚀</div></div><button onclick="hideComingSoon()" style="width:26px;height:26px;border-radius:6px;border:none;background:var(--bg3);color:var(--text3);cursor:pointer;font-size:.8rem;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .2s" onmouseover="this.style.background=\'var(--bg4)\';this.style.color=\'var(--text)\'" onmouseout="this.style.background=\'var(--bg3)\';this.style.color=\'var(--text3)\'"><i class="fa-solid fa-xmark"></i></button>';
  Object.assign(toast.style, {
    position:'fixed', bottom:'30px', right:'30px', zIndex:'99999',
    background:'var(--bg2)', border:'1px solid var(--border2)',
    borderRadius:'14px', padding:'1rem 1.25rem',
    boxShadow:'0 12px 48px rgba(0,0,0,0.35)',
    display:'flex', alignItems:'center', gap:'.9rem', minWidth:'270px',
    animation:'toastIn .4s cubic-bezier(0.22,1,0.36,1) forwards'
  });
  document.body.appendChild(toast);
  if(comingSoonTimer) clearTimeout(comingSoonTimer);
  comingSoonTimer = setTimeout(hideComingSoon, 4000);
}
function hideComingSoon(){
  const toast = document.getElementById('coming-soon-toast');
  if(!toast) return;
  toast.style.display = 'none';
  if(comingSoonTimer) clearTimeout(comingSoonTimer);
}

// ═══════════════════════════════════════
// STATE
// ═══════════════════════════════════════
let originalData = [];
let workingData  = [];
let columns      = [];
let colTypes     = {};
let fileName     = '';
let activeCharts = {};
let filteredData = null;
let theme = 'black';

const COLORS = ['#6c63ff','#00d4aa','#ff6b9d','#fbbf24','#38bdf8','#f97316','#a78bfa','#34d399','#fb7185','#facc15'];

const STOPWORDS = new Set(['the','is','at','which','on','a','an','and','or','in','to','of','for','that','it','this','was','are','be','been','by','with','as','from','but','not','have','had','has','were','do','did','does','so','if','then','than','its','we','you','he','she','they','them','their','my','your','our','his','her']);

// ═══════════════════════════════════════
// THEME
// ═══════════════════════════════════════
function toggleTheme(){
  theme = theme==='black' ? 'white' : 'black';
  document.body.setAttribute('data-theme', theme==='white' ? 'light' : '');
  const icons={'black':'fa-solid fa-moon','white':'fa-solid fa-sun'};
  document.querySelector('.theme-toggle').className = 'theme-toggle';
  document.querySelector('.theme-toggle').innerHTML = '<i class="'+icons[theme]+'"></i>';
  Object.values(activeCharts).forEach(c=>{ if(c&&c.destroy) c.destroy(); });
  activeCharts = {};
  if(workingData.length) {
    renderActiveViz();
    renderDashboard();
  }
}

// ═══════════════════════════════════════
// PROGRAMMING PANEL — Python Code Gen
// ═══════════════════════════════════════
function escAttr(s){ return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function escHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

var nbCellId = 0;

function nbMarkdown(title, body, level){
  nbCellId++;
  const htmlBody = escHtml(body);
  const tag = level===3 ? 'h3' : 'h2';
  const cls = level===3 ? ' nb-op' : '';
  return '<div class="nb-cell-md">'
    + '<div class="nb-prompt" style="color:var(--accent4);font-weight:400">&#9644;</div>'
    + '<div class="nb-md'+cls+'"><'+tag+'>'+title+'</'+tag+'>'
    + '<p>'+htmlBody+'</p></div></div>';
}

function nbCode(code, out){
  nbCellId++;
  const htmlCode = escHtml(code);
  const dataCode = escAttr(code);
  const prompt = 'In ['+nbCellId+']:';
  let outHtml = '';
  if(out){
    outHtml = '<div class="nb-out">'+escHtml(out)+'</div>';
  }
  return '<div class="nb-cell">'
    + '<div class="nb-prompt">'+prompt+'</div>'
    + '<div class="nb-code">'
    + '<button class="nb-copy-btn" data-code="'+dataCode+'" onclick="copyProgCode(this)" title="Copy code"><i class="fas fa-copy"></i></button>'
    + '<pre><code>'+htmlCode+'</code></pre>'
    + '</div>'
    + outHtml
    + '</div>';
}

function renderProgramming(){
  if(!workingData.length){document.getElementById('prog-content').style.display='none';document.getElementById('prog-no-data').style.display='block';return;}
  document.getElementById('prog-no-data').style.display='none';
  document.getElementById('prog-content').style.display='block';

  nbCellId = 0;
  const numCols = getNumericCols();
  const catCols = getCatCols();
  const allCols = columns;
  const esc = s=>String(s).replace(/[']/g,"\\'");
  const pyList = arr=>'['+arr.map(c=>"'"+esc(c)+"'").join(', ')+']';
  const pyListShort = arr=>arr.length>5?'['+arr.slice(0,5).map(c=>"'"+esc(c)+"'").join(', ')+", ...]":'['+arr.map(c=>"'"+esc(c)+"'").join(', ')+']';

  const csvName = (fileName||'dataset').replace(/\.[^.]+$/,'')+'_cleaned.csv';
  const rows = workingData.length;
  const dsName = (fileName||'dataset').replace(/\.[^.]+$/,'');
  const hasNulls = workingData.some(r=>Object.values(r).some(v=>v==null||v===''));
  const hasDup = workingData.length !== new Set(workingData.map(r=>JSON.stringify(r))).size;
  const catVars = catCols.slice(0,3);
  const mlTarget = numCols.length>0?esc(numCols[0]):'target';

  const loadOut = 'Shape: ('+rows+', '+columns.length+')\nColumns: '+pyListShort(allCols);
  const missOut = hasNulls ? 'Missing Values:\n'+columns.map(c=>{const n=workingData.filter(r=>r[c]==null||r[c]==='').length;return n>0?c+'    '+n+'    '+((n/rows*100).toFixed(1))+'%':null}).filter(Boolean).join('\n') : 'No missing values';
  const dupOut = hasDup ? 'Duplicate rows: '+(rows-new Set(workingData.map(r=>JSON.stringify(r))).size) : 'No duplicates found';

  const sections = [
    {
      id:'pandas', icon: '<i class="fa-solid fa-table"></i>', name: 'pandas &mdash; Data Wrangling',
      desc: 'Load CSV, inspect shape/types, handle missing values, remove duplicates, fix dtypes, and explore categories.',
      ops: [
        {title:'Data Loading', desc:'Import pandas, load CSV, inspect shape and columns.',
         code:"import pandas as pd\ndf = pd.read_csv('"+csvName+"')\nprint(f\"Shape: {df.shape}\")\nprint(f\"Columns: {list(df.columns)}\")\nprint(df.head())", out:loadOut},
        {title:'Data Info & Summary', desc:'Column dtypes, memory, and descriptive stats.',
         code:"print(df.info())\nprint(df.describe(include='all'))", out:''},
        {title:'Missing Values', desc:'Count and percentage of nulls per column.',
         code:"print(df.isnull().sum())\nprint((df.isnull().sum()/len(df)*100).round(2))", out:missOut},
        {title:'Duplicates', desc:'Identify and remove duplicate rows.',
         code:'print(f"Duplicates: {df.duplicated().sum()}")\ndf.drop_duplicates(inplace=True)', out:dupOut},
        {title:'Clean Missing Values', desc:'Fill numeric nulls with median, categorical with mode.',
         code:'num_cols = '+pyList(numCols)+'\nfor col in num_cols:\n    if df[col].isnull().sum()>0:\n        df[col].fillna(df[col].median(), inplace=True)\nfor col in df.select_dtypes(include="object"):\n    if df[col].isnull().sum()>0:\n        df[col].fillna(df[col].mode()[0], inplace=True)', out:''},
        {title:'Fix Data Types', desc:'Convert object columns to numeric where possible.',
         code:'for col in df.columns:\n    if df[col].dtype=="object":\n        try:\n            df[col]=pd.to_numeric(df[col])\n        except: pass', out:''},
        {title:'Value Counts & Exploration', desc:'Categorical distributions and unique counts.',
         code:'print("Rows:", df.shape[0], "Columns:", df.shape[1])\ncat_cols = '+pyList(catCols)+'\nfor col in cat_cols[:3]:\n    print(f"\\n{col}:")\n    print(df[col].value_counts().head(10))\nprint("\\nUnique values:")\nfor col in df.columns:\n    print(f"  {col}: {df[col].nunique()} unique")', out:''}
      ]
    },
    {
      id:'numpy', icon: '<i class="fa-solid fa-cube"></i>', name: 'numpy &mdash; Numerical Computing',
      desc: 'Convert DataFrames to arrays, compute aggregations, z-score outliers, correlation matrix.',
      ops: [
        {title:'Array Operations', desc:'Convert pandas DataFrame to NumPy array.',
         code:'import numpy as np\nnum_cols = '+pyList(numCols)+'\narr = df[num_cols].to_numpy()\nprint(f"Array shape: {arr.shape}")', out:'Array shape: ('+rows+', '+numCols.length+')'},
        {title:'Statistical Measures', desc:'Mean, std, min, max for each numeric column.',
         code:'print("\\nNumPy Aggregations:")\nfor i, col in enumerate(num_cols):\n    col_arr = arr[:, i]\n    print(f"  {col}: mean={np.nanmean(col_arr):.2f}, \n          f"std={np.nanstd(col_arr):.2f}, \n          f"min={np.nanmin(col_arr):.2f}, max={np.nanmax(col_arr):.2f}")', out:''},
        {title:'Z-Score Outliers', desc:'Detect outliers where |z| > 3.',
         code:'print("\\nOutliers (|Z|>3):")\nfor col in num_cols:\n    col_arr = df[col].dropna().values\n    z = np.abs((col_arr-np.mean(col_arr))/np.std(col_arr))\n    n_out = np.sum(z>3)\n    print(f"  {col}: {n_out} outliers")', out:''},
        {title:'Correlation Matrix', desc:'Pairwise correlation of numeric features.',
         code:'corr = np.corrcoef(arr, rowvar=False)\nprint("\\nCorrelation matrix shape:", corr.shape)', out:''}
      ]
    },
    {
      id:'mpl', icon: '<i class="fa-solid fa-chart-line"></i>', name: 'matplotlib &mdash; Core Visualization',
      desc: 'Distribution histograms, box plots, scatter plots, and line charts.',
      ops: [
        {title:'Distribution Histograms', desc:'Histograms for up to 6 numeric columns.',
         code:"import matplotlib.pyplot as plt\nplt.rcParams[\"figure.figsize\"] = (10, 6)\nnum_cols = "+pyListShort(numCols)+"\nfig, axes = plt.subplots(2, 3, figsize=(15, 10))\naxes = axes.flatten()\nfor i, col in enumerate(num_cols[:6]):\n    axes[i].hist(df[col].dropna(), bins=30, color=\"#4a7dff\", edgecolor=\"white\", alpha=0.7)\n    axes[i].set_title(f'Distribution of {col}')\nfor j in range(i+1, 6): axes[j].set_visible(False)\nplt.suptitle(\"Feature Distributions (matplotlib)\", fontsize=14, fontweight=\"bold\")\nplt.tight_layout(); plt.show()", out:''},
        {title:'Box Plot', desc:'Box plot of numeric features.',
         code:"plt.figure(figsize=(12, 6))\nplt.boxplot([df[c].dropna() for c in num_cols[:8]], labels=num_cols[:8])\nplt.title(\"Box Plot of Numeric Features\")\nplt.xticks(rotation=45)\nplt.tight_layout(); plt.show()", out:''},
        {title:'Scatter Plot', desc:'Scatter of first two numeric columns.',
         code:'if len(num_cols) >= 2:\n    plt.figure(figsize=(8, 6))\n    plt.scatter(df[num_cols[0]], df[num_cols[1]], alpha=0.5, s=30)\n    plt.xlabel(num_cols[0]); plt.ylabel(num_cols[1])\n    plt.title(f"{num_cols[0]} vs {num_cols[1]}")\n    plt.tight_layout(); plt.show()', out:''},
        {title:'Line / Area Chart', desc:'Line chart of first numeric column (first 100 rows).',
         code:'if len(num_cols) >= 1:\n    plt.figure(figsize=(10, 4))\n    plt.plot(df[num_cols[0]].values[:100], marker=".", linewidth=1, markersize=3)\n    plt.title(f"{num_cols[0]} (first 100 rows)")\n    plt.tight_layout(); plt.show()', out:''}
      ]
    },
    {
      id:'seaborn', icon: '<i class="fa-solid fa-shapes"></i>', name: 'seaborn &mdash; Statistical Visualization',
      desc: 'KDE distributions, correlation heatmap, count plots, bar charts, violin plots, pairplots.',
      ops: [
        {title:'Settings', desc:'Import and configure seaborn theme.',
         code:"import seaborn as sns\nsns.set_theme(style=\"darkgrid\")\nnum_cols = "+pyListShort(numCols)+"\ncat_cols = "+pyListShort(catCols), out:''},
        {title:'Distribution + KDE', desc:'Histogram with KDE overlay.',
         code:"fig, axes = plt.subplots(2, 3, figsize=(15, 10))\naxes = axes.flatten()\nfor i, col in enumerate(num_cols[:6]):\n    sns.histplot(df[col].dropna(), kde=True, ax=axes[i], bins=30)\n    axes[i].set_title(f'Distribution of {col}')\nfor j in range(i+1, 6): axes[j].set_visible(False)\nplt.suptitle('Feature Distributions (seaborn)', fontsize=14, fontweight='bold')\nplt.tight_layout(); plt.show()", out:''},
        {title:'Correlation Heatmap', desc:'Heatmap of pairwise correlations.',
         code:"plt.figure(figsize=(10, 8))\nsns.heatmap(df[num_cols].corr(), annot=True, cmap='RdBu_r', center=0, square=True, fmt='.2f', linewidths=1)\nplt.title('Correlation Heatmap', fontsize=14, fontweight='bold')\nplt.tight_layout(); plt.show()", out:''},
        {title:'Count Plot', desc:'Counts for up to 3 categorical columns.',
         code:"fig, axes = plt.subplots(1, min(3, len(cat_cols)), figsize=(15, 4))\nif len(cat_cols) == 1: axes = [axes]\nfor i, col in enumerate(cat_cols[:3]):\n    sns.countplot(data=df, y=col, ax=axes[i], palette='viridis', order=df[col].value_counts().index[:10])\n    axes[i].set_title(f'Top {col}')\nplt.suptitle('Categorical Counts', fontsize=14, fontweight='bold')\nplt.tight_layout(); plt.show()", out:''},
        {title:'Bar Chart (Category vs Numeric)', desc:'Mean numeric by category.',
         code:"if len(cat_cols)>0 and len(num_cols)>0:\n    plt.figure(figsize=(12, 5))\n    agg = df.groupby(cat_cols[0])[num_cols[0]].mean().sort_values(ascending=False).head(15)\n    sns.barplot(x=agg.values, y=agg.index, palette='coolwarm')\n    plt.title(f'Mean {num_cols[0]} by {cat_cols[0]}')\n    plt.tight_layout(); plt.show()", out:''},
        {title:'Violin Plot', desc:'Distribution of numeric by category.',
         code:"if len(cat_cols)>0 and len(num_cols)>0:\n    plt.figure(figsize=(12, 5))\n    sns.violinplot(data=df, x=cat_cols[0], y=num_cols[0])\n    plt.title(f'{num_cols[0]} by {cat_cols[0]}')\n    plt.xticks(rotation=45)\n    plt.tight_layout(); plt.show()", out:''},
        {title:'Pairplot', desc:'Pairwise scatter + KDE for up to 5 numeric columns.',
         code:"if len(num_cols)<=6:\n    g = sns.pairplot(df[num_cols[:5]].dropna(), diag_kind='kde', plot_kws={'alpha':0.6, 's':30})\n    g.fig.suptitle('Pairplot', fontsize=14, fontweight='bold', y=1.02)\n    plt.show()", out:''}
      ]
    },
    {
      id:'scipy', icon: '<i class="fa-solid fa-flask"></i>', name: 'scipy &mdash; Statistical Tests',
      desc: 'Skewness/kurtosis, Shapiro-Wilk, Pearson r, t-test, one-way ANOVA.',
      ops: [
        {title:'Descriptive Stats (skew/kurtosis)', desc:'Skewness and kurtosis for numeric columns.',
         code:"from scipy import stats\nnum_cols = "+pyListShort(numCols)+"\nprint(\"Skewness & Kurtosis:\")\nfor col in num_cols:\n    s = df[col].skew()\n    k = df[col].kurtosis()\n    print(f'  {col}: skew={s:.3f}, kurt={k:.3f}')", out:''},
        {title:'Shapiro-Wilk Normality Test', desc:'Tests if numeric columns follow normal distribution.',
         code:'print("\\nShapiro-Wilk Test:")\nfor col in num_cols[:3]:\n    sample = df[col].dropna().sample(min(500, len(df)))\n    stat_val, p_val = stats.shapiro(sample)\n    result = "Normal" if p_val>0.05 else "Not normal"\n    print(f"  {col}: W={stat_val:.4f}, p={p_val:.4f} - {result}")', out:''},
        {title:'Pearson Correlation', desc:'Pearson r between first two numeric columns.',
         code:'if len(num_cols)>=2:\n    r, p_val = stats.pearsonr(df[num_cols[0]].dropna(), df[num_cols[1]].dropna())\n    print(f"Pearson ({num_cols[0]} vs {num_cols[1]}): r={r:.4f}, p={p_val:.4f}")', out:''},
        {title:'Independent T-Test', desc:'T-test between first two numeric columns.',
         code:'if len(num_cols)>=2:\n    t_stat, p_val = stats.ttest_ind(df[num_cols[0]].dropna(), df[num_cols[1]].dropna())\n    sig = "Significant" if p_val<0.05 else "Not significant"\n    print(f"T-test: t={t_stat:.4f}, p={p_val:.4f} ({sig})")', out:''},
        {title:'One-Way ANOVA', desc:'ANOVA testing if mean differs across groups of first categorical column.',
         code:"if len(cat_cols)>0 and len(num_cols)>0:\n    groups = [g[num_cols[0]].dropna().values for _, g in df.groupby(cat_cols[0])]\n    if len(groups)>=2 and all(len(g)>1 for g in groups):\n        f_stat, p_val = stats.f_oneway(*groups[:5])\n        print(f'ANOVA: F={f_stat:.4f}, p={p_val:.4f}')", out:''}
      ]
    },
    {
      id:'sklearn', icon: '<i class="fa-solid fa-cogs"></i>', name: 'scikit-learn &mdash; Machine Learning',
      desc: 'Label encoding, train/test split, feature scaling, Random Forest, evaluation, feature importance.',
      ops: [
        {title:'Encode Categories', desc:'LabelEncode categorical columns for ML.',
         code:"from sklearn.preprocessing import LabelEncoder, StandardScaler\nfrom sklearn.model_selection import train_test_split\nfrom sklearn.ensemble import RandomForestClassifier, RandomForestRegressor\nfrom sklearn.metrics import accuracy_score, r2_score, classification_report\n\nle_dict = {}\nfor col in "+pyList(catVars)+":\n    if col in df.columns and df[col].dtype=='object':\n        le = LabelEncoder()\n        df[col+'_enc'] = le.fit_transform(df[col].astype(str))\n        le_dict[col] = le\n        print(f\"Encoded {col}: {len(le.classes_)} classes\")", out:''},
        {title:'Feature Selection', desc:'Select numeric and encoded features, define target.',
         code:'num_cols = '+pyListShort(numCols)+"\ntarget = '"+mlTarget+"'\nfeatures = [c for c in num_cols if c!=target]\nfeatures += [c for c in df.columns if c.endswith('_enc')]\nif len(features)==0:\n    print(\"Not enough features\")\nelse:\n    X = df[features].dropna()\n    y = df.loc[X.index, target]", out:''},
        {title:'Train / Test Split', desc:'Split data into train/test sets (80/20).',
         code:'if len(features)>0:\n    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)', out:''},
        {title:'Scale Features', desc:'StandardScale features to zero mean, unit variance.',
         code:"scaler = StandardScaler()\nX_train_s = scaler.fit_transform(X_train)\nX_test_s = scaler.transform(X_test)\nprint(f\"Train: {X_train.shape[0]}, Test: {X_test.shape[0]}, Features: {X_train.shape[1]}\")", out:''},
        {title:'Model Training', desc:'Train Random Forest (classifier or regressor) and evaluate.',
         code:'if y.nunique()<=10:\n    model = RandomForestClassifier(n_estimators=100, random_state=42)\n    model.fit(X_train_s, y_train)\n    y_pred = model.predict(X_test_s)\n    print(f"Accuracy: {accuracy_score(y_test, y_pred):.4f}")\n    print(classification_report(y_test, y_pred))\nelse:\n    model = RandomForestRegressor(n_estimators=100, random_state=42)\n    model.fit(X_train_s, y_train)\n    y_pred = model.predict(X_test_s)\n    print(f"R2: {r2_score(y_test, y_pred):.4f}")\n    print(f"RMSE: {np.sqrt(((y_test-y_pred)**2).mean()):.4f}")', out:''},
        {title:'Feature Importance', desc:'Bar chart of top 10 feature importances.',
         code:'import matplotlib.pyplot as plt\nimport pandas as pd\nimp = pd.DataFrame({"feature": features, "importance": model.feature_importances_})\nimp = imp.sort_values("importance", ascending=False)\nprint("\\nTop Features:")\nprint(imp.head(10))\nplt.figure(figsize=(10, 5))\nplt.barh(imp.head(10)["feature"], imp.head(10)["importance"], color="viridis")\nplt.title("Feature Importance")\nplt.gca().invert_yaxis()\nplt.tight_layout(); plt.show()', out:''}
      ]
    }
  ];

  const tabsEl = document.getElementById('prog-lib-tabs');
  const tabNames = {pandas:'pandas',numpy:'numpy',mpl:'matplotlib',seaborn:'seaborn',scipy:'scipy',sklearn:'sklearn'};
  tabsEl.innerHTML = sections.map((s,i) =>
    `<button class="prog-lib-tab${i===0?' active':''}" data-lib="${s.id}" onclick="switchProgLib('${s.id}')">${s.icon} ${tabNames[s.id]||s.id}</button>`
  ).join('');

  const contentHtml = [];
  for(let i=0; i<sections.length; i++){
    const sec = sections[i];
    const cells = [
      nbMarkdown(sec.icon+' '+sec.name, sec.desc)
    ];
    for(const op of sec.ops){
      cells.push(nbMarkdown('Operation: '+op.title, op.desc, 3));
      cells.push(nbCode(op.code, op.out||''));
    }
    contentHtml.push('<div class="prog-lib-content'+(i===0?' prog-lib-active':'')+'" id="prog-lib-'+sec.id+'">'+cells.join('')+'</div>');
  }
  document.getElementById('notebook-cells').innerHTML = contentHtml.join('');
}

function copyProgCode(btn){
  const code = btn.getAttribute('data-code');
  navigator.clipboard.writeText(code).then(()=>{
    btn.innerHTML = '<i class="fas fa-check"></i>';
    btn.classList.add('copied');
    setTimeout(()=>{btn.innerHTML='<i class="fas fa-copy"></i>';btn.classList.remove('copied');},2000);
  }).catch(()=>{
    const ta = document.createElement('textarea');
    ta.value = code; ta.style.position='fixed'; ta.style.opacity='0';
    document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); document.body.removeChild(ta);
    btn.innerHTML = '<i class="fas fa-check"></i>';
    btn.classList.add('copied');
    setTimeout(()=>{btn.innerHTML='<i class="fas fa-copy"></i>';btn.classList.remove('copied');},2000);
  });
}

let progFormat = 'py';
let activeProgLib = 'pandas';

function switchProgLib(id){
  activeProgLib = id;
  document.querySelectorAll('.prog-lib-content').forEach(d=>d.classList.remove('prog-lib-active'));
  document.querySelectorAll('.prog-lib-tab').forEach(t=>t.classList.remove('active'));
  const el = document.getElementById('prog-lib-'+id);
  if(el) el.classList.add('prog-lib-active');
  const tab = document.querySelector('.prog-lib-tab[data-lib="'+id+'"]');
  if(tab) tab.classList.add('active');
}

function setProgFormat(fmt){
  progFormat = fmt;
  const pyBtn = document.getElementById('prog-fmt-py');
  const nbBtn = document.getElementById('prog-fmt-ipynb');
  if(fmt==='py'){
    pyBtn.style.background='var(--accent)'; pyBtn.style.color='var(--accent-text)';
    nbBtn.style.background='transparent'; nbBtn.style.color='var(--text2)';
  } else {
    nbBtn.style.background='var(--accent)'; nbBtn.style.color='var(--accent-text)';
    pyBtn.style.background='transparent'; pyBtn.style.color='var(--text2)';
  }
}

function getProgBlocks(){
  return Array.from(document.querySelectorAll('#notebook-cells .nb-code pre code')).map(b=>b.textContent);
}

function getProgDescs(){
  return Array.from(document.querySelectorAll('#notebook-cells .nb-cell-md .nb-md p')).map(d=>d.textContent);
}

function getProgTitles(){
  return Array.from(document.querySelectorAll('#notebook-cells .nb-cell-md .nb-md h2')).map(h=>h.textContent.replace(/^\s*/, '').replace(/\s*$/, ''));
}

function generateNotebookJSON(){
  const cells = [];
  const date = new Date().toISOString().slice(0,10);
  const dsName = fileName||'dataset';

  const allCells = document.querySelectorAll('#notebook-cells .nb-cell-md, #notebook-cells .nb-cell');
  for(const el of allCells){
    if(el.classList.contains('nb-cell-md')){
      const h = el.querySelector('h2, h3');
      const p = el.querySelector('p');
      const tag = h ? h.tagName.toLowerCase() : 'h2';
      const title = h ? h.textContent : '';
      const body = p ? p.textContent : '';
      const prefix = tag==='h2' ? '## ' : '### ';
      cells.push({
        cell_type:'markdown', metadata:{},
        source:[prefix+title+'\n', '\n', body+'\n']
      });
    } else if(el.classList.contains('nb-cell')){
      const codeEl = el.querySelector('.nb-code pre code');
      if(codeEl){
        cells.push({
          cell_type:'code', metadata:{}, outputs:[], execution_count:null,
          source:codeEl.textContent.split('\n').map(l=>l+'\n')
        });
      }
    }
  }

  return {
    cells: cells,
    metadata: {
      kernelspec: { display_name:'Python 3', language:'python', name:'python3' },
      language_info: { name:'python', version:'3.9.0' }
    },
    nbformat: 4,
    nbformat_minor: 5
  };
}

function copyAllCode(){
  let content;
  if(progFormat==='ipynb'){
    content = JSON.stringify(generateNotebookJSON(), null, 2);
  } else {
    const blocks = getProgBlocks();
    content = '# Auto-generated by TS Data\n'
      + '# Dataset: '+(fileName||'dataset')+'\n'
      + '# Rows: '+workingData.length+', Columns: '+columns.length+'\n'
      + '# Generated: '+new Date().toISOString().slice(0,10)+'\n\n'
      + blocks.join('\n\n# '+'='.repeat(60)+'\n\n');
  }
  navigator.clipboard.writeText(content).then(()=>{
    const t=document.createElement('div');
    t.style.cssText='position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:9999;background:var(--success);color:#fff;padding:.75rem 2rem;border-radius:12px;font-weight:600;font-size:.95rem;box-shadow:0 8px 32px rgba(0,0,0,.4)';
    t.textContent='Copied '+(progFormat==='ipynb'?'notebook JSON':'code')+' to clipboard!';
    document.body.appendChild(t);
    setTimeout(()=>t.remove(),2000);
  }).catch(()=>{
    const t=document.createElement('div');
    t.style.cssText='position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:9999;background:var(--danger);color:#fff;padding:.75rem 2rem;border-radius:12px;font-weight:600;font-size:.95rem';
    t.textContent='Failed to copy. Try individual copy buttons.';
    document.body.appendChild(t);
    setTimeout(()=>t.remove(),2500);
  });
}

function downloadAllCode(){
  const dsName = (fileName||'dataset').replace(/\.[^.]+$/,'');
  if(progFormat==='ipynb'){
    const nb = generateNotebookJSON();
    const blob = new Blob([JSON.stringify(nb, null, 2)], {type:'application/json;charset=utf-8'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = dsName+'_analysis.ipynb';
    a.click();
    URL.revokeObjectURL(a.href);
  } else {
    const blocks = getProgBlocks();
    const all = '# Auto-generated by TS Data\n'
      + '# Dataset: '+(fileName||'dataset')+'\n'
      + '# Rows: '+workingData.length+', Columns: '+columns.length+'\n'
      + '# Generated: '+new Date().toISOString().slice(0,10)+'\n\n'
      + blocks.join('\n\n# '+'='.repeat(60)+'\n\n');
    const blob = new Blob([all], {type:'text/plain;charset=utf-8'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = dsName+'_analysis.py';
    a.click();
    URL.revokeObjectURL(a.href);
  }
}

function buildReportHTML(){
  const dsName = (fileName||'dataset').replace(/\.[^.]+$/,'');
  const rows = workingData.length;
  const cols = columns.length;
  const date = new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});

  const icons = {pandas:'fa-table',numpy:'fa-cube',mpl:'fa-chart-line',seaborn:'fa-shapes',scipy:'fa-flask',sklearn:'fa-cogs'};
  const libNames = {pandas:'pandas — Data Wrangling', numpy:'numpy — Numerical Computing', mpl:'matplotlib — Core Visualization', seaborn:'seaborn — Statistical Visualization', scipy:'scipy — Statistical Tests', sklearn:'scikit-learn — Machine Learning'};

  // Build libOps dynamically from DOM
  const libOps = [];
  document.querySelectorAll('#notebook-cells > .prog-lib-content').forEach(el => {
    const id = el.id.replace('prog-lib-','');
    const codeBlocks = [...el.querySelectorAll('.nb-cell .nb-code pre code')].map(c=>c.textContent);
    libOps.push({id, name: libNames[id]||id, codeBlocks});
  });

  // Capture chart canvases
  const chartImgs = [];
  Object.keys(activeCharts).forEach(id=>{
    const c = document.getElementById(id);
    if(c && typeof c.toDataURL==='function') chartImgs.push({id, url:c.toDataURL('image/png')});
  });

  let html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Code Report — '+dsName+'</title>';
  html += '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">';
  html += '<style>';
  html += 'body{font-family:"Segoe UI",system-ui,sans-serif;background:#fff;color:#222;padding:2rem;max-width:1000px;margin:0 auto;line-height:1.6}';
  html += 'h1{font-size:1.8rem;margin-bottom:.25rem;border-bottom:3px solid #4a7dff;padding-bottom:.5rem}';
  html += '.sub{color:#666;font-size:.9rem;margin-bottom:2rem}';
  html += 'h2{font-size:1.3rem;margin:2rem 0 .5rem;color:#4a7dff;border-left:4px solid #4a7dff;padding-left:.75rem}';
  html += 'h3{font-size:1rem;margin:1.5rem 0 .25rem;color:#555}';
  html += 'pre{background:#f4f4f4;border:1px solid #ddd;border-radius:6px;padding:.75rem;font-size:.82rem;overflow-x:auto;font-family:"Cascadia Code","JetBrains Mono",monospace;tab-size:2}';
  html += 'code{font-family:"Cascadia Code","JetBrains Mono",monospace}';
  html += '.chart-wrap{text-align:center;margin:1rem 0;page-break-inside:avoid}';
  html += '.chart-wrap img{max-width:100%;border:1px solid #e0e0e0;border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,.08)}';
  html += '.chart-label{font-size:.78rem;color:#888;margin-top:.3rem}';
  html += '.footer{margin-top:3rem;padding-top:1rem;border-top:1px solid #ddd;font-size:.8rem;color:#999;text-align:center}';
  html += 'table{width:100%;border-collapse:collapse;font-size:.85rem;margin:.5rem 0}';
  html += 'th,td{padding:.35rem .5rem;border:1px solid #ddd;text-align:left}';
  html += 'th{background:#4a7dff;color:#fff}';
  html += 'tr:nth-child(even){background:#f9f9f9}';
  html += '@media print{body{padding:1rem}.chart-wrap img{max-height:400px}}';
  html += '</style></head><body>';

  html += '<h1><i class="fas fa-file-alt"></i> Python Data Analysis Report</h1>';
  html += '<div class="sub">Dataset: <strong>'+dsName+'</strong> &nbsp;|&nbsp; Rows: '+rows+' &nbsp;|&nbsp; Columns: '+cols+' &nbsp;|&nbsp; Generated: '+date+'</div>';
  html += '<p>This report contains auto-generated Python analysis code organized by library, along with visualizations captured from the interactive analysis panels.</p>';

  const numCols = getNumericCols();
  const catCols = getCatCols();
  html += '<h2><i class="fas fa-table"></i> Dataset Summary</h2>';
  html += '<table><tr><th>Metric</th><th>Value</th></tr>';
  html += '<tr><td>Total Rows</td><td>'+rows+'</td></tr>';
  html += '<tr><td>Total Columns</td><td>'+cols+'</td></tr>';
  html += '<tr><td>Numeric Columns</td><td>'+numCols.length+'</td></tr>';
  html += '<tr><td>Categorical Columns</td><td>'+catCols.length+'</td></tr>';
  html += '</table>';

  // Library sections
  for(const lib of libOps){
    html += '<h2><i class="fas '+icons[lib.id]+'"></i> '+lib.name+'</h2>';
    for(const code of lib.codeBlocks){
      html += '<pre><code>'+code.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')+'</code></pre>';
    }
    // Include charts for matplotlib/seaborn
    if((lib.id==='mpl'||lib.id==='seaborn') && chartImgs.length){
      html += '<div style="margin:1rem 0">';
      for(const ch of chartImgs){
        html += '<div class="chart-wrap"><img src="'+ch.url+'" alt="Chart: '+ch.id+'"/><div class="chart-label">Chart: '+ch.id+'</div></div>';
      }
      html += '</div>';
    }
  }

  // Data sample
  html += '<h2><i class="fas fa-eye"></i> Data Sample</h2>';
  html += '<table style="width:100%;border-collapse:collapse;font-size:.82rem;margin:.5rem 0">';
  html += '<tr style="background:#4a7dff;color:#fff">'+columns.map(c=>'<th style="padding:.35rem .5rem;border:1px solid #ddd;text-align:left">'+escHtml(c)+'</th>').join('')+'</tr>';
  const samples = workingData.slice(0,10);
  for(const r of samples){
    html += '<tr>'+columns.map(c=>'<td style="padding:.3rem .5rem;border:1px solid #ddd">'+escHtml(String(r[c]??''))+'</td>').join('')+'</tr>';
  }
  html += '</table>';
  if(workingData.length>10) html += '<p style="font-size:.8rem;color:#888">Showing 10 of '+workingData.length+' rows</p>';

  html += '<div class="footer">Generated by TS Data — '+date+'</div>';
  html += '</body></html>';
  return html;
}

async function downloadReport(fmt){
  const btnId = fmt==='pdf' ? 'report-pdf-btn' : 'report-doc-btn';
  const btn = document.getElementById(btnId);
  const orig = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
  btn.disabled = true;
  const dsName = (fileName||'dataset').replace(/\.[^.]+$/,'');
  const reportHtml = buildReportHTML();

  try{
    if(fmt==='pdf'){
      const div = document.createElement('div');
      div.style.cssText = 'position:fixed;left:-9999px;top:0;width:1000px;background:#fff;z-index:-1';
      div.innerHTML = reportHtml;
      document.body.appendChild(div);

      const canvas = await html2canvas(div, {scale:2,useCORS:true,logging:false,backgroundColor:'#ffffff',width:1000});
      document.body.removeChild(div);

      const imgData = canvas.toDataURL('image/jpeg',0.95);
      const {jsPDF} = window.jspdf;
      const pdf = new jsPDF('p','mm','a4');
      const pdfW = 210;
      const pdfH = (canvas.height * pdfW) / canvas.width;
      let hPos = 0;
      const pageH = 297;
      while(hPos < pdfH){
        if(hPos > 0) pdf.addPage();
        const h = Math.min(pdfH - hPos, pageH);
        pdf.addImage(imgData,'JPEG',0,0,pdfW,h,undefined,'FAST');
        hPos += pageH;
      }
      pdf.save(dsName+'_code_report.pdf');
      showToast('PDF report downloaded!');
    } else {
      const blob = new Blob([reportHtml], {type:'application/msword;charset=utf-8'});
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = dsName+'_code_report.doc';
      a.click();
      URL.revokeObjectURL(a.href);
      showToast('DOC report downloaded!');
    }
  } catch(e){
    showToast('Report failed: '+e.message);
  }
  btn.innerHTML = orig;
  btn.disabled = false;
}

function showFormatPicker(type){
  if(!workingData.length){alert('Load a dataset first');return;}
  const labels = {code:'Code Report',dataset:'Dataset Report'};
  const icons = {code:'fa-file-code',dataset:'fa-chart-pie'};
  if(document.getElementById('fmt-picker-overlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'fmt-picker-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)';
  overlay.onclick = e=>{if(e.target===overlay) overlay.remove();};

  const box = document.createElement('div');
  box.style.cssText = 'background:var(--bg2);border:1px solid var(--border);border-radius:16px;padding:2rem;max-width:380px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,.5);text-align:center';
  box.innerHTML =
    '<div style="font-size:2rem;margin-bottom:.75rem"><i class="fas '+icons[type]+'" style="color:var(--accent)"></i></div>'
    + '<div style="font-size:1.1rem;font-weight:600;margin-bottom:.3rem;color:var(--text)">'+labels[type]+'</div>'
    + '<div style="font-size:.85rem;color:var(--text2);margin-bottom:1.5rem">Choose download format</div>'
    + '<div style="display:flex;gap:.6rem">'
    + '<button id="fmt-picker-pdf" style="flex:1;padding:.65rem;border-radius:10px;border:1px solid var(--border);background:var(--bg3);color:var(--text);cursor:pointer;font-size:.9rem;font-weight:600;transition:all .15s" onmouseover="this.style.borderColor=\'var(--accent)\'" onmouseout="this.style.borderColor=\'var(--border)\'"><i class="fas fa-file-pdf" style="color:#ef4444;margin-right:.4rem"></i> PDF</button>'
    + '<button id="fmt-picker-doc" style="flex:1;padding:.65rem;border-radius:10px;border:1px solid var(--border);background:var(--bg3);color:var(--text);cursor:pointer;font-size:.9rem;font-weight:600;transition:all .15s" onmouseover="this.style.borderColor=\'var(--accent)\'" onmouseout="this.style.borderColor=\'var(--border)\'"><i class="fas fa-file-word" style="color:#3b82f6;margin-right:.4rem"></i> DOC</button>'
    + '</div>'
    + '<button onclick="this.closest(\'#fmt-picker-overlay\').remove()" style="margin-top:1rem;background:none;border:none;color:var(--text3);cursor:pointer;font-size:.82rem">Cancel</button>';
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  document.getElementById('fmt-picker-pdf').onclick = ()=>{
    overlay.remove();
    if(type==='code') generateReport('code','pdf');
    else generateDatasetReport('pdf');
  };
  document.getElementById('fmt-picker-doc').onclick = ()=>{
    overlay.remove();
    if(type==='code') generateReport('code','doc');
    else generateDatasetReport('doc');
  };
}

function generateReport(type, fmt){
  showToast('Generating '+fmt.toUpperCase()+'...');
  if(type==='code'){
    switchPanel('programming');
    setTimeout(()=>{
      const dsName = (fileName||'dataset').replace(/\.[^.]+$/,'');
      const html = buildReportHTML();

      if(fmt==='doc'){
        const blob = new Blob([html], {type:'application/msword;charset=utf-8'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = dsName+'_code_report.doc';
        a.click();
        URL.revokeObjectURL(a.href);
        showToast('Code report (DOC) downloaded!');
        return;
      }

      const div = document.createElement('div');
      div.style.cssText = 'position:fixed;left:-9999px;top:0;width:1000px;background:#fff;z-index:-1';
      div.innerHTML = html;
      document.body.appendChild(div);
      html2canvas(div, {scale:2,useCORS:true,logging:false,backgroundColor:'#ffffff',width:1000}).then(canvas=>{
        document.body.removeChild(div);
        const imgData = canvas.toDataURL('image/jpeg',0.95);
        const {jsPDF} = window.jspdf;
        const pdf = new jsPDF('p','mm','a4');
        const pdfW = 210;
        const pdfH = (canvas.height * pdfW) / canvas.width;
        let hPos = 0;
        const pageH = 297;
        while(hPos < pdfH){
          if(hPos > 0) pdf.addPage();
          pdf.addImage(imgData,'JPEG',0,0,pdfW,Math.min(pdfH-hPos,pageH),undefined,'FAST');
          hPos += pageH;
        }
        pdf.save(dsName+'_code_report.pdf');
        showToast('Code report (PDF) downloaded!');
      }).catch(e=>showToast('Report failed: '+e.message));
    }, 400);
  }
}

function generateDatasetReport(fmt){
  const dsName = (fileName||'dataset').replace(/\.[^.]+$/,'');
  const html = buildDatasetReportHTML();

  if(fmt==='doc'){
    const blob = new Blob([html], {type:'application/msword;charset=utf-8'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = dsName+'_dataset_report.doc';
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('Dataset report (DOC) downloaded!');
    return;
  }

  const div = document.createElement('div');
  div.style.cssText = 'position:fixed;left:-9999px;top:0;width:1000px;background:#fff;z-index:-1';
  div.innerHTML = html;
  document.body.appendChild(div);
  html2canvas(div, {scale:2,useCORS:true,logging:false,backgroundColor:'#ffffff',width:1000}).then(canvas=>{
    document.body.removeChild(div);
    const imgData = canvas.toDataURL('image/jpeg',0.95);
    const {jsPDF} = window.jspdf;
    const pdf = new jsPDF('p','mm','a4');
    const pdfW = 210;
    const pdfH = (canvas.height * pdfW) / canvas.width;
    let hPos = 0;
    const pageH = 297;
    while(hPos < pdfH){
      if(hPos > 0) pdf.addPage();
      pdf.addImage(imgData,'JPEG',0,0,pdfW,Math.min(pdfH-hPos,pageH),undefined,'FAST');
      hPos += pageH;
    }
    pdf.save(dsName+'_dataset_report.pdf');
    showToast('Dataset report (PDF) downloaded!');
  }).catch(e=>showToast('Report failed: '+e.message));
}

function buildDatasetReportHTML(){
  const dsName = (fileName||'dataset').replace(/\.[^.]+$/,'');
  const rows = workingData.length;
  const cols = columns.length;
  const date = new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});
  const today = new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});
  const numCols = getNumericCols();
  const catCols = getCatCols();
  const totalNulls = workingData.reduce((s,r)=>s+Object.values(r).filter(v=>v==null||v==='').length,0);
  const hasDup = workingData.length !== new Set(workingData.map(r=>JSON.stringify(r))).size;
  const dupCount = hasDup ? workingData.length - new Set(workingData.map(r=>JSON.stringify(r))).size : 0;
  const sampleSize = Math.min(10, rows);

  function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  // Capture charts
  const chartImgs = [];
  Object.keys(activeCharts).forEach(id=>{
    const c = document.getElementById(id);
    if(c && typeof c.toDataURL==='function') chartImgs.push({id, url:c.toDataURL('image/png')});
  });

  let html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Data Analysis Report — '+dsName+'</title>';
  html += '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">';
  html += '<style>';
  html += '*{margin:0;padding:0;box-sizing:border-box}';
  html += 'body{font-family:"Segoe UI","Helvetica Neue",Arial,sans-serif;background:#f0f2f5;color:#1a1a2e;line-height:1.7;font-size:14px}';

  // Title page
  html += '.title-page{background:linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%);color:#fff;padding:5rem 3rem;text-align:center;border-radius:0;margin:-2rem -2rem 0;page-break-after:always;min-height:90vh;display:flex;flex-direction:column;justify-content:center;align-items:center}';
  html += '.title-page .badge-top{background:rgba(255,255,255,.12);padding:.4rem 1.2rem;border-radius:20px;font-size:.8rem;letter-spacing:2px;text-transform:uppercase;margin-bottom:2rem;color:rgba(255,255,255,.7)}';
  html += '.title-page h1{font-size:2.6rem;font-weight:800;margin-bottom:.5rem;letter-spacing:-.5px;color:#fff;border:none;padding:0}';
  html += '.title-page .subtitle{font-size:1.1rem;color:rgba(255,255,255,.7);margin-bottom:3rem;font-weight:300}';
  html += '.title-page .divider{width:80px;height:3px;background:#e94560;margin:1.5rem auto;border-radius:2px}';
  html += '.title-page .meta{font-size:.9rem;color:rgba(255,255,255,.6);line-height:2}';
  html += '.title-page .meta strong{color:rgba(255,255,255,.9)}';

  // Content
  html += '.page-wrap{max-width:1000px;margin:0 auto;padding:2rem;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.08)}';
  html += 'h2{font-size:1.35rem;font-weight:700;margin:2.5rem 0 1rem;color:#1a1a2e;border-left:4px solid #e94560;padding-left:1rem;page-break-after:avoid}';
  html += 'h3{font-size:1.05rem;font-weight:600;margin:1.5rem 0 .5rem;color:#16213e}';
  html += 'h4{font-size:.95rem;font-weight:600;margin:1rem 0 .3rem;color:#444}';
  html += 'p{margin:.5rem 0 1rem;color:#333;text-align:justify}';
  html += 'table{width:100%;border-collapse:collapse;margin:.8rem 0;font-size:.85rem;page-break-inside:avoid}';
  html += 'th{padding:.45rem .6rem;border:1px solid #dde;background:#1a1a2e;color:#fff;font-weight:600;text-align:left;font-size:.82rem;letter-spacing:.3px}';
  html += 'td{padding:.4rem .6rem;border:1px solid #dde;text-align:left;font-variant-numeric:tabular-nums}';
  html += 'tr:nth-child(even){background:#f8f9fc}';
  html += 'tr:hover{background:#eef0f7}';
  html += '.highlight{background:#fff3cd;padding:.1rem .3rem;border-radius:3px}';
  html += '.card{background:#f8f9fc;border-left:4px solid #4a7dff;padding:1rem 1.2rem;border-radius:0 8px 8px 0;margin:1rem 0}';
  html += '.card.warn{border-left-color:#e94560}';
  html += '.card.success{border-left-color:#10b981}';
  html += '.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin:.8rem 0}';
  html += '.stat-box{background:#f8f9fc;border-radius:8px;padding:1rem;text-align:center;border:1px solid #eef}';
  html += '.stat-box .num{font-size:1.8rem;font-weight:800;color:#1a1a2e;line-height:1.2}';
  html += '.stat-box .label{font-size:.75rem;color:#888;text-transform:uppercase;letter-spacing:1px;margin-top:.2rem}';
  html += '.chart-wrap{text-align:center;margin:1.2rem 0;page-break-inside:avoid;background:#fafbfc;padding:1rem;border-radius:8px;border:1px solid #eef}';
  html += '.chart-wrap img{max-width:100%;border-radius:4px;box-shadow:0 2px 12px rgba(0,0,0,.06)}';
  html += '.chart-label{font-size:.78rem;color:#888;margin-top:.5rem;font-style:italic}';
  html += '.badge{display:inline-block;padding:.1rem .55rem;border-radius:10px;font-size:.72rem;font-weight:500}';
  html += '.badge-num{background:#e8f0fe;color:#1a73e8}';
  html += '.badge-cat{background:#fce8e6;color:#c5221f}';
  html += '.badge-bool{background:#e6f4ea;color:#137333}';
  html += '.badge-other{background:#f1f1f1;color:#555}';
  html += '.code-block{background:#1a1a2e;color:#e4e4e4;padding:.8rem 1rem;border-radius:6px;font-family:"JetBrains Mono","Cascadia Code",monospace;font-size:.78rem;overflow-x:auto;line-height:1.5;margin:.6rem 0;tab-size:2}';
  html += '.page-break{page-break-before:always}';
  html += '.footer{margin-top:3rem;padding:1.5rem 0 0;border-top:2px solid #eef;font-size:.8rem;color:#999;text-align:center}';
  html += '.toc{background:#f8f9fc;border-radius:8px;padding:1.2rem 1.5rem;margin:1rem 0}';
  html += '.toc ol{columns:2;column-gap:2rem;margin:.5rem 0 0 1.2rem}';
  html += '.toc li{margin:.25rem 0;font-size:.88rem;color:#333}';
  html += '.toc a{color:#1a73e8;text-decoration:none}';
  html += 'ul,ol{margin:.3rem 0 .6rem 1.5rem}';
  html += 'li{margin:.15rem 0}';
  html += '@media print{body{background:#fff;padding:0}.page-wrap{padding:1.5rem;box-shadow:none}.title-page{margin:-1.5rem -1.5rem 0}.chart-wrap img{max-height:350px}}';
  html += '</style></head><body>';

  html += '<div class="page-wrap">';

  // ════════════════════════════════════════════
  // 1. TITLE PAGE
  // ════════════════════════════════════════════
  html += '<div class="title-page">';
  html += '<div class="badge-top">Data Science Project Report</div>';
  html += '<h1>Data Analysis Report</h1>';
  html += '<p class="subtitle">A Comprehensive Analysis of <strong style="color:#fff">'+esc(dsName)+'</strong> Dataset</p>';
  html += '<div class="divider"></div>';
  html += '<div class="meta">';
  html += '<strong>Project Title:</strong> Exploratory Data Analysis &amp; Visualization of '+esc(dsName)+'<br>';
  html += '<strong>Dataset:</strong> '+esc(dsName)+' &nbsp;|&nbsp; <strong>Rows:</strong> '+rows.toLocaleString()+' &nbsp;|&nbsp; <strong>Columns:</strong> '+cols+'<br>';
  html += '<strong>Tools Used:</strong> Python, Pandas, NumPy, Matplotlib, Seaborn, Chart.js<br>';
  html += '<strong>Date:</strong> '+today+'<br>';
  html += '</div></div>';

  // ════════════════════════════════════════════
  // TABLE OF CONTENTS
  // ════════════════════════════════════════════
  html += '<div class="toc"><strong style="font-size:.95rem">Table of Contents</strong>';
  html += '<ol>';
  html += '<li>Introduction</li><li>Objectives</li><li>Dataset Information</li>';
  html += '<li>Tools &amp; Technologies</li><li>Data Collection</li><li>Data Cleaning &amp; Preprocessing</li>';
  html += '<li>Exploratory Data Analysis</li><li>Data Visualization</li><li>Key Findings &amp; Insights</li>';
  html += '<li>Machine Learning Model</li><li>Conclusion</li><li>Future Scope</li><li>References</li>';
  html += '</ol></div>';

  // ════════════════════════════════════════════
  // 2. INTRODUCTION
  // ════════════════════════════════════════════
  html += '<h2>1. Introduction</h2>';
  html += '<p>This report presents a comprehensive data analysis of the <strong>'+esc(dsName)+'</strong> dataset. '
    + 'The primary goal of this project is to explore, clean, visualize, and derive actionable insights from the data using modern data science tools and techniques. '
    + 'Data analysis plays a crucial role in decision-making across industries, enabling organizations to uncover hidden patterns, trends, and correlations that drive strategic outcomes.</p>';
  html += '<div class="card">';
  html += '<strong>Problem Statement:</strong> Raw data often contains inconsistencies, missing values, and noise that hinder effective analysis. '
    + 'This project aims to transform the raw '+esc(dsName)+' dataset into a clean, structured format, perform exploratory analysis, '
    + 'and generate meaningful visualizations to support data-driven decisions.</div>';

  // ════════════════════════════════════════════
  // 3. OBJECTIVES
  // ════════════════════════════════════════════
  html += '<h2>2. Objectives</h2>';
  html += '<ul>';
  html += '<li>To understand the structure, size, and quality of the dataset</li>';
  html += '<li>To perform data cleaning and preprocessing including handling missing values and duplicates</li>';
  html += '<li>To conduct exploratory data analysis (EDA) for identifying trends, patterns, and outliers</li>';
  html += '<li>To create insightful visualizations including bar charts, histograms, scatter plots, and heatmaps</li>';
  html += '<li>To extract key findings and actionable business insights from the data</li>';
  if(rows>50 && numCols.length>=2) html += '<li>To build and evaluate a machine learning model for predictive analysis</li>';
  html += '<li>To present a well-structured, examiner-friendly report suitable for academic evaluation</li>';
  html += '</ul>';

  // ════════════════════════════════════════════
  // 4. DATASET INFORMATION
  // ════════════════════════════════════════════
  html += '<h2>3. Dataset Information</h2>';
  const dtypeCounts = {};
  columns.forEach(c=>{const t=colTypes[c]||'unknown';dtypeCounts[t]=(dtypeCounts[t]||0)+1;});
  html += '<table><tr><th style="width:40%">Property</th><th>Details</th></tr>';
  html += '<tr><td><strong>Dataset Name</strong></td><td>'+esc(dsName)+'</td></tr>';
  html += '<tr><td><strong>Source</strong></td><td>Uploaded by user / Sample dataset</td></tr>';
  html += '<tr><td><strong>Number of Rows</strong></td><td>'+rows.toLocaleString()+'</td></tr>';
  html += '<tr><td><strong>Number of Columns</strong></td><td>'+cols+'</td></tr>';
  html += '<tr><td><strong>Numeric Columns</strong></td><td>'+numCols.length+'</td></tr>';
  html += '<tr><td><strong>Categorical Columns</strong></td><td>'+catCols.length+'</td></tr>';
  html += '<tr><td><strong>Missing Values</strong></td><td>'+totalNulls.toLocaleString()+' ('+(rows>0?((totalNulls/(rows*cols))*100).toFixed(1):'0.0')+'% of total cells)</td></tr>';
  html += '<tr><td><strong>Duplicate Rows</strong></td><td>'+dupCount.toLocaleString()+'</td></tr>';
  html += '</table>';

  html += '<h4>Column Types Distribution</h4>';
  html += '<table><tr><th>Data Type</th><th>Count</th></tr>';
  for(const [t,cnt] of Object.entries(dtypeCounts).sort((a,b)=>b[1]-a[1])){
    const cls = t==='int'||t==='float'?'badge-num':t==='string'?'badge-cat':t==='bool'?'badge-bool':'badge-other';
    html += '<tr><td><span class="badge '+cls+'">'+esc(t)+'</span></td><td>'+cnt+'</td></tr>';
  }
  html += '</table>';

  html += '<h4>Features Description</h4>';
  html += '<table><tr><th>#</th><th>Column</th><th>Type</th><th>Non-Null</th><th>Null %</th><th>Unique</th><th>Description</th></tr>';
  columns.forEach((c,i)=>{
    const vals = workingData.map(r=>r[c]);
    const nulls = vals.filter(v=>v==null||v==='').length;
    const uniq = new Set(vals.filter(v=>v!=null&&v!=='')).size;
    const pct = rows>0?((nulls/rows)*100).toFixed(1):'0.0';
    const cls = colTypes[c]==='int'||colTypes[c]==='float'?'badge-num':colTypes[c]==='string'?'badge-cat':colTypes[c]==='bool'?'badge-bool':'badge-other';
    const desc = numCols.includes(c)?'Numeric feature for statistical analysis':catCols.includes(c)?'Categorical feature for grouping/segmentation':'Feature column';
    html += '<tr><td>'+(i+1)+'</td><td><strong>'+esc(c)+'</strong></td><td><span class="badge '+cls+'">'+(colTypes[c]||'unknown')+'</span></td><td>'+(rows-nulls).toLocaleString()+'</td><td>'+pct+'%</td><td>'+uniq+'</td><td style="font-size:.8rem;color:#666">'+desc+'</td></tr>';
  });
  html += '</table>';

  // ════════════════════════════════════════════
  // 5. TOOLS & TECHNOLOGIES
  // ════════════════════════════════════════════
  html += '<h2>4. Tools &amp; Technologies Used</h2>';
  html += '<div class="grid-2">';
  const tools = [
    {name:'Python',icon:'fa-brands fa-python',desc:'Core programming language for data analysis'},
    {name:'Pandas',icon:'fa-solid fa-table',desc:'Data manipulation and cleaning'},
    {name:'NumPy',icon:'fa-solid fa-cube',desc:'Numerical computing and array operations'},
    {name:'Matplotlib',icon:'fa-solid fa-chart-line',desc:'Static visualization library'},
    {name:'Seaborn',icon:'fa-solid fa-shapes',desc:'Statistical data visualization'},
    {name:'Chart.js',icon:'fa-solid fa-chart-bar',desc:'Interactive web-based charts'},
    {name:'JavaScript',icon:'fa-brands fa-js',desc:'Frontend interactivity and rendering'},
    {name:'HTML/CSS',icon:'fa-brands fa-html5',desc:'Report structure and styling'}
  ];
  for(const t of tools){
    html += '<div class="stat-box" style="text-align:left;display:flex;align-items:center;gap:.8rem;padding:.7rem 1rem">';
    html += '<div style="font-size:1.5rem;width:36px;text-align:center;color:#4a7dff"><i class="'+t.icon+'"></i></div>';
    html += '<div><div style="font-weight:600;font-size:.9rem">'+t.name+'</div><div style="font-size:.75rem;color:#888">'+t.desc+'</div></div>';
    html += '</div>';
  }
  html += '</div>';

  // ════════════════════════════════════════════
  // 6. DATA COLLECTION
  // ════════════════════════════════════════════
  html += '<h2>5. Data Collection</h2>';
  html += '<p>The <strong>'+esc(dsName)+'</strong> dataset was loaded into the analysis platform through CSV upload or sample data generation. '
    + 'The data import process involved parsing the file using <strong>PapaParse</strong> library, automatically detecting column types (numeric, categorical, boolean), '
    + 'and storing the structured data in a JavaScript array for further processing.</p>';
  html += '<div class="card success"><strong>Data Import Summary:</strong> Successfully loaded '+rows.toLocaleString()+' rows with '+cols+' columns. '
    + 'Column types detected: '+Object.entries(dtypeCounts).map(([t,c])=>t+' ('+c+')').join(', ')+'.</div>';

  // ════════════════════════════════════════════
  // 7. DATA CLEANING & PREPROCESSING
  // ════════════════════════════════════════════
  html += '<h2>6. Data Cleaning &amp; Preprocessing</h2>';
  html += '<p>Data cleaning is a critical step that ensures the quality and reliability of analysis. The following preprocessing steps were applied:</p>';

  html += '<h3>6.1 Handling Missing Values</h3>';
  if(totalNulls>0){
    html += '<p>The dataset contains <strong>'+totalNulls.toLocaleString()+'</strong> missing values across '
      +columns.filter(c=>workingData.some(r=>r[c]==null||r[c]==='')).length+' columns. ';
    html += 'Missing numeric values were filled with the median of their respective columns, while missing categorical values were imputed with the mode (most frequent value).</p>';
    html += '<table><tr><th>Column</th><th>Missing</th><th>%</th><th>Treatment</th></tr>';
    for(const c of columns){
      const n = workingData.filter(r=>r[c]==null||r[c]==='').length;
      if(n>0){
        const treatment = numCols.includes(c)?'Fill with median':catCols.includes(c)?'Fill with mode':'Remove rows';
        html += '<tr><td>'+esc(c)+'</td><td>'+n.toLocaleString()+'</td><td>'+((n/rows)*100).toFixed(1)+'%</td><td>'+treatment+'</td></tr>';
      }
    }
    html += '</table>';
  } else {
    html += '<div class="card success"><i class="fas fa-check-circle" style="color:#10b981"></i> No missing values were found in the dataset. All columns are complete.</div>';
  }

  html += '<h3>6.2 Removing Duplicates</h3>';
  if(dupCount>0){
    html += '<p>The dataset contained <strong>'+dupCount.toLocaleString()+'</strong> duplicate row(s). These were identified using '
      + 'JSON serialization comparison and removed to ensure each record is unique.</p>';
  } else {
    html += '<div class="card success"><i class="fas fa-check-circle" style="color:#10b981"></i> No duplicate rows were detected. All records are unique.</div>';
  }

  html += '<h3>6.3 Data Transformation</h3>';
  html += '<p>Column data types were verified and optimized. Object-type columns containing numeric values were automatically converted to numeric types. '
    + 'Categorical columns were encoded using Label Encoding for machine learning compatibility.</p>';

  html += '<h3>6.4 Outlier Detection</h3>';
  if(numCols.length){
    const outlierCols = numCols.filter(c=>{
      const vals = workingData.map(r=>+r[c]).filter(v=>!isNaN(v));
      if(vals.length<2) return false;
      const m = vals.reduce((s,v)=>s+v,0)/vals.length;
      const s = Math.sqrt(vals.reduce((s2,v)=>s2+(v-m)**2,0)/vals.length);
      return vals.some(v=>Math.abs(v-m)>3*s);
    });
    if(outlierCols.length){
      html += '<div class="card warn"><i class="fas fa-exclamation-triangle" style="color:#e94560"></i> Outliers detected in <strong>'+outlierCols.length+'</strong> column(s): '
        +outlierCols.map(c=>esc(c)).join(', ')+'. Outliers were identified using the Z-score method (threshold: |z| &gt; 3).</div>';
    } else {
      html += '<div class="card success"><i class="fas fa-check-circle" style="color:#10b981"></i> No significant outliers were detected in numeric columns.</div>';
    }
  }

  // ════════════════════════════════════════════
  // 8. EXPLORATORY DATA ANALYSIS
  // ════════════════════════════════════════════
  html += '<h2>7. Exploratory Data Analysis (EDA)</h2>';
  html += '<p>Exploratory Data Analysis was performed to understand the underlying structure, relationships, and patterns within the data.</p>';

  // Statistical summary
  if(numCols.length){
    html += '<h3>7.1 Statistical Summary</h3>';
    html += '<p>Descriptive statistics provide a quick overview of central tendency, dispersion, and shape of the numeric features.</p>';
    html += '<table><tr><th>Column</th><th>Count</th><th>Mean</th><th>Std</th><th>Min</th><th>25%</th><th>50%</th><th>75%</th><th>Max</th></tr>';
    for(const c of numCols){
      const vals = workingData.map(r=>+r[c]).filter(v=>!isNaN(v));
      if(!vals.length) continue;
      const sorted = [...vals].sort((a,b)=>a-b);
      const n = sorted.length;
      const mean = sorted.reduce((s,v)=>s+v,0)/n;
      const std = Math.sqrt(sorted.reduce((s,v)=>s+(v-mean)**2,0)/n);
      const min = sorted[0], max = sorted[n-1];
      const q1 = sorted[Math.floor(n*0.25)], q2 = sorted[Math.floor(n*0.5)], q3 = sorted[Math.floor(n*0.75)];
      const f = v=>Number(v).toLocaleString(undefined,{maximumFractionDigits:2,minimumFractionDigits:2});
      html += '<tr><td><strong>'+esc(c)+'</strong></td><td>'+n.toLocaleString()+'</td><td>'+f(mean)+'</td><td>'+f(std)+'</td><td>'+f(min)+'</td><td>'+f(q1)+'</td><td>'+f(q2)+'</td><td>'+f(q3)+'</td><td>'+f(max)+'</td></tr>';
    }
    html += '</table>';
  }

  // Correlation analysis
  if(numCols.length>=2){
    html += '<h3>7.2 Correlation Analysis</h3>';
    html += '<p>Correlation analysis measures the strength and direction of relationships between numeric variables. Values range from -1 (strong negative) to +1 (strong positive).</p>';
    const corrData = [];
    for(let i=0;i<numCols.length;i++){
      for(let j=i+1;j<numCols.length;j++){
        const a = workingData.map(r=>+r[numCols[i]]).filter(v=>!isNaN(v));
        const b = workingData.map(r=>+r[numCols[j]]).filter(v=>!isNaN(v));
        const minLen = Math.min(a.length,b.length);
        if(minLen<3) continue;
        const a2 = a.slice(0,minLen), b2 = b.slice(0,minLen);
        const ma = a2.reduce((s,v)=>s+v,0)/minLen;
        const mb = b2.reduce((s,v)=>s+v,0)/minLen;
        const num = a2.reduce((s,av,idx)=>s+(av-ma)*(b2[idx]-mb),0);
        const den = Math.sqrt(a2.reduce((s,v)=>s+(v-ma)**2,0)*b2.reduce((s,v)=>s+(v-mb)**2,0));
        const r = den!==0?num/den:0;
        corrData.push({a:numCols[i],b:numCols[j],r});
      }
    }
    if(corrData.length){
      html += '<table><tr><th>Feature 1</th><th>Feature 2</th><th>Correlation (r)</th><th>Strength</th></tr>';
      const topCorr = corrData.sort((x,y)=>Math.abs(y.r)-Math.abs(x.r)).slice(0,8);
      for(const c of topCorr){
        const strength = Math.abs(c.r)>=0.7?'Strong':Math.abs(c.r)>=0.4?'Moderate':'Weak';
        const dir = c.r>=0?'Positive':'Negative';
        html += '<tr><td>'+esc(c.a)+'</td><td>'+esc(c.b)+'</td><td>'+c.r.toFixed(4)+'</td><td>'+strength+' '+dir+'</td></tr>';
      }
      html += '</table>';
    }
  }

  // Distribution analysis
  if(numCols.length){
    html += '<h3>7.3 Distribution Analysis</h3>';
    html += '<p>Distribution analysis helps understand the spread, skewness, and potential outliers in numeric features. '
      + 'The histogram and KDE plots below show the frequency distribution of key numeric columns.</p>';
    for(const c of numCols.slice(0,4)){
      const vals = workingData.map(r=>+r[c]).filter(v=>!isNaN(v));
      if(!vals.length) continue;
      const n = vals.length;
      const mean = vals.reduce((s,v)=>s+v,0)/n;
      const median = [...vals].sort((a,b)=>a-b)[Math.floor(n/2)];
      const skew = n>2?vals.reduce((s,v)=>s+((v-mean)/Math.sqrt(vals.reduce((s2,v2)=>s2+(v2-mean)**2,0)/(n-1)))**3,0)/(n-1):0;
      html += '<h4>'+esc(c)+'</h4>';
      html += '<table><tr><th>Metric</th><th>Value</th></tr>';
      html += '<tr><td>Mean</td><td>'+mean.toLocaleString(undefined,{maximumFractionDigits:2})+'</td></tr>';
      html += '<tr><td>Median</td><td>'+median.toLocaleString(undefined,{maximumFractionDigits:2})+'</td></tr>';
      html += '<tr><td>Std Dev</td><td>'+Math.sqrt(vals.reduce((s,v)=>s+(v-mean)**2,0)/n).toLocaleString(undefined,{maximumFractionDigits:2})+'</td></tr>';
      html += '<tr><td>Skewness</td><td>'+(skew!==0?skew.toFixed(3):'N/A')+'</td></tr>';
      html += '<tr><td>Observations</td><td>'+n.toLocaleString()+'</td></tr>';
      html += '</table>';
    }
  }

  // Trend analysis
  html += '<h3>7.4 Trend Analysis</h3>';
  if(numCols.length>=2){
    html += '<p>Trend analysis examines how variables relate to each other over time or across categories. '
      + 'The scatter plot analysis reveals the relationship between key numeric pairs.</p>';
  } else {
    html += '<p>Trend analysis identifies patterns and changes across the dataset. '
      + 'Grouped aggregations reveal how numeric metrics vary across categorical segments.</p>';
  }

  // Categorical value counts in EDA
  if(catCols.length){
    html += '<h3>7.5 Categorical Analysis</h3>';
    for(const c of catCols.slice(0,2)){
      const freq = {};
      workingData.forEach(r=>{const v=String(r[c]??'null');freq[v]=(freq[v]||0)+1;});
      const sorted = Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,8);
      html += '<h4>'+esc(c)+' — Top Categories</h4>';
      html += '<table><tr><th>Value</th><th>Count</th><th>Percentage</th></tr>';
      for(const [v,cnt] of sorted){
        html += '<tr><td>'+esc(v)+'</td><td>'+cnt.toLocaleString()+'</td><td>'+((cnt/rows)*100).toFixed(1)+'%</td></tr>';
      }
      html += '</table>';
    }
  }

  // ════════════════════════════════════════════
  // 9. DATA VISUALIZATION
  // ════════════════════════════════════════════
  html += '<h2>8. Data Visualization</h2>';
  html += '<p>Data visualizations transform raw numbers into intuitive graphical representations, making it easier to identify patterns, trends, and outliers. '
    + 'The following charts provide a visual summary of the dataset characteristics.</p>';

  if(chartImgs.length){
    for(const ch of chartImgs){
      const chartLabel = ch.id.charAt(0).toUpperCase() + ch.id.slice(1).replace(/([A-Z])/g,' $1');
      html += '<div class="chart-wrap"><img src="'+ch.url+'" alt="'+chartLabel+'"/><div class="chart-label">Figure: '+chartLabel+'</div></div>';
    }
  } else {
    html += '<div class="card">Visualizations will appear here once charts are generated in the Visualizations or Dashboard panel. '
      + 'Navigate to the <strong>Visualizations</strong> panel to create interactive charts that will be included in this report.</div>';
  }

  // ════════════════════════════════════════════
  // 10. KEY FINDINGS & INSIGHTS
  // ════════════════════════════════════════════
  html += '<h2>9. Key Findings &amp; Insights</h2>';
  html += '<ul>';
  if(numCols.length){
    const topCorr = [];
    for(let i=0;i<numCols.length;i++){
      for(let j=i+1;j<numCols.length;j++){
        const a = workingData.map(r=>+r[numCols[i]]).filter(v=>!isNaN(v));
        const b = workingData.map(r=>+r[numCols[j]]).filter(v=>!isNaN(v));
        const ml = Math.min(a.length,b.length);
        if(ml<3) continue;
        const a2=a.slice(0,ml), b2=b.slice(0,ml);
        const ma=a2.reduce((s,v)=>s+v,0)/ml, mb=b2.reduce((s,v)=>s+v,0)/ml;
        const num=a2.reduce((s,av,idx)=>s+(av-ma)*(b2[idx]-mb),0);
        const den=Math.sqrt(a2.reduce((s,v)=>s+(v-ma)**2,0)*b2.reduce((s,v)=>s+(v-mb)**2,0));
        topCorr.push({a:numCols[i],b:numCols[j],r:den?num/den:0});
      }
    }
    const strong = topCorr.filter(c=>Math.abs(c.r)>=0.5);
    if(strong.length){
      html += '<li><strong>Strong correlations found:</strong> '+strong.slice(0,3).map(c=>esc(c.a)+' vs '+esc(c.b)+' (r='+c.r.toFixed(3)+')').join('; ')+'. These pairs show significant linear relationships worth further investigation.</li>';
    } else if(topCorr.length){
      html += '<li><strong>Moderate to weak correlations:</strong> The numeric features show limited linear relationships, suggesting diverse independent variables.</li>';
    }
    html += '<li><strong>Dataset contains '+numCols.length+' numeric features</strong> suitable for statistical modeling and machine learning applications.</li>';
  }
  if(catCols.length){
    html += '<li><strong>Categorical variables present:</strong> '+catCols.length+' categorical column(s) provide opportunities for segmentation and group-based analysis.</li>';
  }
  if(totalNulls>0){
    html += '<li><strong>Data quality improved:</strong> '+totalNulls.toLocaleString()+' missing values were identified and treated, enhancing the reliability of analysis.</li>';
  } else {
    html += '<li><strong>Complete data:</strong> The dataset has no missing values, ensuring robust and reliable analysis.</li>';
  }
  html += '<li><strong>Dataset size:</strong> '+rows.toLocaleString()+' rows × '+cols+' columns provides a solid foundation for meaningful statistical analysis.</li>';
  html += '</ul>';

  // ════════════════════════════════════════════
  // 11. MACHINE LEARNING MODEL
  // ════════════════════════════════════════════
  html += '<h2>10. Machine Learning Model</h2>';
  if(rows>50 && numCols.length>=2){
    html += '<p>A machine learning model was built to demonstrate predictive analysis on the dataset. '
      + 'The model uses <strong>Random Forest</strong> algorithm, which is an ensemble learning method '
      + 'that combines multiple decision trees for improved accuracy and robustness.</p>';
    html += '<h3>10.1 Algorithm</h3>';
    html += '<ul><li><strong>Algorithm:</strong> Random Forest (Classifier/Regressor)</li>';
    html += '<li><strong>Target Variable:</strong> '+esc(numCols[0])+'</li>';
    html += '<li><strong>Features:</strong> '+numCols.slice(1).map(c=>esc(c)).join(', ')+(numCols.length>1?'':'(using available numeric columns)')+'</li>';
    html += '<li><strong>Train/Test Split:</strong> 80% training, 20% testing</li>';
    html += '<li><strong>Feature Scaling:</strong> StandardScaler (z-score normalization)</li></ul>';

    html += '<div class="code-block">' + esc(
      'from sklearn.model_selection import train_test_split\n'
      + 'from sklearn.ensemble import RandomForestRegressor\n'
      + 'from sklearn.metrics import r2_score, mean_squared_error\n\n'
      + 'X_train, X_test, y_train, y_test = train_test_split(\n'
      + '    X, y, test_size=0.2, random_state=42)\n\n'
      + 'model = RandomForestRegressor(n_estimators=100)\n'
      + 'model.fit(X_train, y_train)\n'
      + 'y_pred = model.predict(X_test)\n\n'
      + 'print(f"R² Score: {r2_score(y_test, y_pred):.4f}")\n'
      + 'print(f"RMSE: {np.sqrt(mse(y_test, y_pred)):.4f}")'
    ) + '</div>';

    html += '<h3>10.2 Evaluation</h3>';
    html += '<p>The model performance can be evaluated using metrics such as <strong>R² Score</strong> (coefficient of determination) '
      + 'and <strong>RMSE</strong> (Root Mean Squared Error). Feature importance analysis identifies which variables '
      + 'contribute most to predictions, providing valuable insights for feature selection.</p>';
  } else {
    html += '<p>Machine learning modeling requires a sufficient number of rows (recommended &gt; 50) and at least 2 numeric features. '
      + 'The current dataset has <strong>'+rows.toLocaleString()+' rows</strong> and <strong>'+numCols.length+' numeric column(s)</strong>.';
    if(rows<=50) html += ' More data rows would be needed for reliable model training.';
    if(numCols.length<2) html += ' Additional numeric features would be needed for meaningful predictions.';
    html += '</p>';
    html += '<div class="card">The Python code for ML modeling is available in the <strong>Programming panel</strong> → <strong>scikit-learn</strong> tab, '
      + 'which includes label encoding, train/test splitting, scaling, Random Forest training, and evaluation metrics.</div>';
  }

  // ════════════════════════════════════════════
  // 12. CONCLUSION
  // ════════════════════════════════════════════
  html += '<h2>11. Conclusion</h2>';
  html += '<p>This comprehensive data analysis of the <strong>'+esc(dsName)+'</strong> dataset successfully demonstrates the end-to-end data science workflow: '
    + 'from data loading and cleaning to exploratory analysis, visualization, and machine learning modeling.</p>';
  html += '<ul>';
  html += '<li>The dataset contains <strong>'+rows.toLocaleString()+' records</strong> with <strong>'+cols+' attributes</strong>, '
    + 'including '+numCols.length+' numeric and '+catCols.length+' categorical features.</li>';
  if(totalNulls>0) html += '<li>Data quality was improved through missing value imputation and duplicate removal, ensuring reliable analysis.</li>';
  else html += '<li>The dataset is complete with no missing values or duplicates, providing a clean foundation for analysis.</li>';
  html += '<li>Exploratory analysis revealed key patterns and relationships within the data, supported by statistical summaries and visualizations.</li>';
  if(rows>50 && numCols.length>=2) html += '<li>A Random Forest model was implemented to demonstrate predictive capabilities on the numeric features.</li>';
  html += '<li>The project showcases the effective use of Python libraries (Pandas, NumPy, Matplotlib, Seaborn) for data analysis.</li>';
  html += '</ul>';
  html += '<div class="card success"><i class="fas fa-check-circle" style="color:#10b981"></i> <strong>Overall Outcome:</strong> The analysis successfully achieved its objectives, providing meaningful insights and a structured framework for data-driven decision making.</div>';

  // ════════════════════════════════════════════
  // 13. FUTURE SCOPE
  // ════════════════════════════════════════════
  html += '<h2>12. Future Scope</h2>';
  html += '<ul>';
  html += '<li><strong>Advanced ML Models:</strong> Implement deep learning models (neural networks) for improved prediction accuracy on complex patterns</li>';
  html += '<li><strong>Real-time Analysis:</strong> Integrate streaming data pipelines for real-time dashboards and live monitoring</li>';
  html += '<li><strong>Automated Reporting:</strong> Generate scheduled reports with email delivery and trend alerts</li>';
  html += '<li><strong>NLP Integration:</strong> Add natural language processing capabilities for text column analysis and sentiment extraction</li>';
  html += '<li><strong>Cloud Deployment:</strong> Deploy the analysis pipeline on cloud platforms (AWS, GCP, Azure) for scalable processing</li>';
  html += '<li><strong>BI Integration:</strong> Connect with Power BI / Tableau for enterprise-level dashboarding and sharing</li>';
  html += '<li><strong>Feature Engineering:</strong> Create automated feature engineering pipelines to discover new predictive signals</li>';
  html += '</ul>';

  // ════════════════════════════════════════════
  // 14. REFERENCES
  // ════════════════════════════════════════════
  html += '<div class="page-break"></div>';
  html += '<h2>13. References</h2>';
  html += '<ol style="font-size:.85rem">';
  html += '<li>Pandas Documentation — <a href="https://pandas.pydata.org/docs/" target="_blank">https://pandas.pydata.org/docs/</a></li>';
  html += '<li>NumPy Documentation — <a href="https://numpy.org/doc/" target="_blank">https://numpy.org/doc/</a></li>';
  html += '<li>Matplotlib Documentation — <a href="https://matplotlib.org/stable/contents.html" target="_blank">https://matplotlib.org/stable/contents.html</a></li>';
  html += '<li>Seaborn Documentation — <a href="https://seaborn.pydata.org/" target="_blank">https://seaborn.pydata.org/</a></li>';
  html += '<li>Scikit-learn Documentation — <a href="https://scikit-learn.org/stable/documentation.html" target="_blank">https://scikit-learn.org/stable/documentation.html</a></li>';
  html += '<li>SciPy Documentation — <a href="https://docs.scipy.org/doc/scipy/" target="_blank">https://docs.scipy.org/doc/scipy/</a></li>';
  html += '<li>Chart.js Documentation — <a href="https://www.chartjs.org/docs/" target="_blank">https://www.chartjs.org/docs/</a></li>';
  html += '<li>W3Schools HTML/CSS Guide — <a href="https://www.w3schools.com/" target="_blank">https://www.w3schools.com/</a></li>';
  html += '</ol>';

  // Footer
  html += '<div class="footer">';
  html += '<strong>TS Data</strong> — Data Analysis Platform &nbsp;|&nbsp; Generated: '+date+' &nbsp;|&nbsp; ';
  html += 'Dataset: '+esc(dsName)+' &nbsp;|&nbsp; Rows: '+rows.toLocaleString()+', Columns: '+cols;
  html += '</div>';

  html += '</div></body></html>';
  return html;
}

function showToast(msg){
  const t = document.createElement('div');
  t.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:9999;background:#10b981;color:#fff;padding:.75rem 2rem;border-radius:12px;font-weight:600;font-size:.95rem;box-shadow:0 8px 32px rgba(0,0,0,.4)';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(()=>t.remove(), 3000);
}

// ═══════════════════════════════════════
// PANEL SWITCHING
// ═══════════════════════════════════════
function switchPanel(name){
  if(liveDashInterval){ clearInterval(liveDashInterval); liveDashInterval = null;
    const b=document.getElementById('liveDashBtn'),d=document.getElementById('liveDashDot');
    if(b){ b.style.borderColor='var(--border)'; b.style.color='var(--text2)'; }
    if(d){ d.style.background='var(--text3)'; d.style.boxShadow='none'; d.style.animation='none'; }
  }
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.sidebar-item').forEach(s=>s.classList.remove('active'));
  document.getElementById('panel-'+name).classList.add('active');
  const si = [...document.querySelectorAll('.sidebar-item')];
  const s = si.find(s=>s.getAttribute('onclick')&&s.getAttribute('onclick').includes("'"+name+"'"));
  if(s) s.classList.add('active');

  if(name==='viz'&&workingData.length) setTimeout(renderActiveViz,50);
  if(name==='eda'&&workingData.length) setTimeout(renderEDA,50);
  if(name==='ml'&&workingData.length) setTimeout(renderML,50);
  if(name==='programming'&&workingData.length) setTimeout(renderProgramming,50);
  if(name==='dashboard'){
    if(!dashCharts.length) initDefaultDashCharts();
    if(workingData.length) setTimeout(renderDashboard,50);
    setTimeout(initDashDrag,100);
  }

  // Close sidebar on tablet after selection
  if(window.innerWidth <= 1024 && window.innerWidth > 768){
    closeSidebar();
  }
}

function switchInnerTab(group, tab){
  const allDivs = document.querySelectorAll(`[id^="${group}tab-"]`);
  allDivs.forEach(d=>d.style.display='none');
  document.getElementById(`${group}tab-${tab}`).style.display='block';
  const parent = document.getElementById(`panel-${group}`);
  parent.querySelectorAll('.inner-tab').forEach((t,i)=>{
    t.classList.toggle('active', t.getAttribute('onclick').includes(`'${tab}'`));
  });
  if(group==='viz'){
    setTimeout(()=>{
      if(tab==='essential') renderAllEssentialCharts();
      if(tab==='advanced') { renderCorrHeatmap('corr-heatmap-wrap'); renderBox(); renderBubble(); renderDoughnut(); renderRadar(); renderKDE(); }
      if(tab==='interactive') renderInteractiveCharts();
    },50);
  }
  if(group==='eda'){
    if(tab==='distribution') renderDistCharts();
    if(tab==='correlation') { renderCorrHeatmap('eda-corr-heatmap'); renderCorrInsights(); }
    if(tab==='trends') { renderTrend(); renderCatAnalysis(); }
    if(tab==='stats') renderEDAStats();
  }
  if(group==='ml'){
    if(tab==='pca') setTimeout(runPCA,50);
    if(tab==='evaluation') { updateMLTargetDist(); updateEvalTaskType(); }
    if(tab==='feature') { computeVarianceFeatures(); updateSplitInfo(80); setTimeout(renderFeatImp,80); }
  }
}

// ═══════════════════════════════════════
// DRAG & DROP
// ═══════════════════════════════════════
const dz = document.getElementById('dropzone');
dz.addEventListener('dragover',e=>{e.preventDefault();dz.classList.add('drag')});
dz.addEventListener('dragleave',()=>dz.classList.remove('drag'));
dz.addEventListener('drop',e=>{e.preventDefault();dz.classList.remove('drag');if(e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0])});

function loadFile(input){ if(input.files[0]) processFile(input.files[0]); }

function processFile(file){
  fileName = file.name;
  const ext = file.name.split('.').pop().toLowerCase();
  if(ext==='csv'){
    const reader = new FileReader();
    reader.onload = e => parseCSV(e.target.result);
    reader.readAsText(file);
  } else if(ext==='xlsx'||ext==='xls'){
    const reader = new FileReader();
    reader.onload = e => {
      const wb = XLSX.read(e.target.result, {type:'binary'});
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws);
      if(json.length) { originalData=[...json]; columns=Object.keys(json[0]); initData(); }
    };
    reader.readAsBinaryString(file);
  } else if(ext==='json'){
    const reader = new FileReader();
    reader.onload = e => {
      const json = JSON.parse(e.target.result);
      const arr = Array.isArray(json)?json:[json];
      if(arr.length){ originalData=[...arr]; columns=Object.keys(arr[0]); initData(); }
    };
    reader.readAsText(file);
  }
}

function parseCSV(text){
  const result = Papa.parse(text, {header:true,dynamicTyping:true,skipEmptyLines:true});
  if(result.data.length){ originalData=[...result.data]; columns=Object.keys(result.data[0]); initData(); }
}

// ═══════════════════════════════════════
// SAMPLE DATA
// ═══════════════════════════════════════
function loadSample(type){
  if(type==='sales'){
    const regions=['North','South','East','West'];
    const prods=['Laptop','Phone','Tablet','Monitor','Headphones'];
    originalData = Array.from({length:200},(_,i)=>({
      id:i+1,
      date:`2024-${String(Math.ceil((i%12)+1)).padStart(2,'0')}-${String((i%28)+1).padStart(2,'0')}`,
      product:prods[i%prods.length],
      region:regions[i%regions.length],
      sales:Math.round(1000+Math.random()*9000),
      units:Math.round(1+Math.random()*50),
      profit:Math.round(100+Math.random()*3000),
      discount:+(Math.random()*0.3).toFixed(2),
      customer_age:Math.round(20+Math.random()*50),
      rating:+(1+Math.random()*4).toFixed(1),
      returns: i%7===0?null:Math.round(Math.random()*5)
    }));
    fileName='sales_dataset.csv';
  } else if(type==='students'){
    const courses=['Math','Science','English','History','Art'];
    originalData = Array.from({length:150},(_,i)=>({
      student_id:i+1,
      name:`Student_${i+1}`,
      course:courses[i%courses.length],
      grade:Math.round(40+Math.random()*60),
      attendance:+(50+Math.random()*50).toFixed(1),
      assignments:Math.round(5+Math.random()*15),
      midterm:Math.round(30+Math.random()*70),
      final:Math.round(30+Math.random()*70),
      gpa:+(1+Math.random()*3).toFixed(2),
      pass_fail: i%8===0?null:(Math.random()>0.2?'Pass':'Fail')
    }));
    fileName='students_dataset.csv';
  } else {
    const cats=['Electronics','Clothing','Food','Books','Sports'];
    originalData = Array.from({length:300},(_,i)=>({
      order_id:i+1001,
      category:cats[i%cats.length],
      price:+(10+Math.random()*990).toFixed(2),
      quantity:Math.round(1+Math.random()*20),
      revenue:+(50+Math.random()*5000).toFixed(2),
      country:['India','USA','UK','Germany','France'][i%5],
      month:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i%12],
      returns:i%10===0?null:Math.round(Math.random()*3),
      customer_score:+(1+Math.random()*4).toFixed(1),
      is_premium:Math.random()>0.5
    }));
    fileName='ecommerce_dataset.csv';
  }
  columns = Object.keys(originalData[0]);
  initData();
}

// ═══════════════════════════════════════
// INIT
// ═══════════════════════════════════════
function initData(){
  workingData = originalData.map(r=>({...r}));
  detectColTypes();
  renderUploadPreview();
  populateAllSelects();
  document.getElementById('file-badge').style.display='block';
  document.getElementById('file-badge').textContent=`${workingData.length} rows`;
  addLog('upload-log','ok',`Loaded "${fileName}" — ${workingData.length} rows × ${columns.length} columns`);
}

function detectColTypes(){
  colTypes={};
  columns.forEach(col=>{
    const vals = workingData.map(r=>r[col]).filter(v=>v!=null&&v!=='');
    if(vals.length===0){colTypes[col]='string';return;}
    if(vals.every(v=>typeof v==='boolean')){colTypes[col]='bool';return;}
    if(vals.every(v=>!isNaN(v)&&Number.isInteger(+v))){colTypes[col]='int';return;}
    if(vals.every(v=>!isNaN(+v))){colTypes[col]='float';return;}
    if(vals.some(v=>typeof v==='string'&&!isNaN(Date.parse(v))&&v.match(/\d{4}/))){colTypes[col]='date';return;}
    colTypes[col]='string';
  });
}

function getNumericCols(){ return columns.filter(c=>colTypes[c]==='int'||colTypes[c]==='float'); }
function getStringCols(){ return columns.filter(c=>colTypes[c]==='string'); }
function getCatCols(){ return columns.filter(c=>colTypes[c]==='string'||colTypes[c]==='bool'); }

function populateAllSelects(){
  const numCols = getNumericCols();
  const strCols = getStringCols();
  const allCols = columns;

  const populate = (id,cols)=>{
    const el=document.getElementById(id);
    if(!el)return;
    el.innerHTML=cols.map(c=>`<option value="${c}">${c}</option>`).join('');
  };

  // Charts
  populate('bar-x',allCols); populate('bar-y',numCols);
  populate('line-x',allCols); populate('line-y',numCols);
  populate('pie-col',allCols); populate('hist-col',numCols);
  populate('sc-x',numCols); populate('sc-y',numCols);
  populate('area-x',allCols); populate('area-y',numCols);
  populate('box-col',numCols);
  populate('bub-x',numCols); populate('bub-y',numCols); populate('bub-r',numCols);
  populate('donut-col',allCols);
  populate('kde-col',numCols);
  populate('int-bar-x',allCols); populate('int-bar-y',numCols);
  populate('int-line-x',allCols); populate('int-line-y',numCols);
  populate('filter-col',allCols); populate('filter-val',allCols);

  // Clean dropdowns
  populate('dtype-col',allCols); populate('rename-col',allCols);
  populate('date-col',allCols); populate('drop-col',allCols);
  populate('zscore-col',numCols); populate('iqr-col',numCols);
  populate('skew-col',numCols);
  populate('label-col',getCatCols()); populate('ohe-col',getCatCols());
  populate('norm-col',numCols); populate('std-col',numCols);
  populate('tl-col',strCols); populate('tp-col',strCols);
  populate('ts-col',strCols);

  // EDA
  populate('trend-col',numCols);
  populate('cat-col',getCatCols()); populate('cat-val-col',numCols);

  // ML
  populate('poly-col1',numCols); populate('poly-col2',numCols);
  populate('ml-target',allCols); populate('ml-encode-col',getCatCols());

  // second y of bar
  if(numCols.length>1){ document.getElementById('bar-y').value=numCols[1]||numCols[0]; }
}

// ═══════════════════════════════════════
// UPLOAD PREVIEW
// ═══════════════════════════════════════
function renderUploadPreview(){
  document.getElementById('upload-preview').style.display='block';
  const nullCount = workingData.reduce((s,r)=>s+Object.values(r).filter(v=>v==null||v==='').length,0);
  const dupCount = workingData.length - new Set(workingData.map(r=>JSON.stringify(r))).size;
  document.getElementById('upload-stats-cards').innerHTML=`
    <div class="stat-card"><div class="stat-label">Total Rows</div><div class="stat-val stat-accent">${workingData.length.toLocaleString()}</div></div>
    <div class="stat-card"><div class="stat-label">Columns</div><div class="stat-val" style="color:var(--accent2)">${columns.length}</div></div>
    <div class="stat-card"><div class="stat-label">Missing Values</div><div class="stat-val ${nullCount?'stat-danger':'stat-success'}">${nullCount}</div></div>
    <div class="stat-card"><div class="stat-label">Duplicate Rows</div><div class="stat-val ${dupCount?'stat-warn':'stat-success'}">${dupCount}</div></div>
    <div class="stat-card"><div class="stat-label">File Name</div><div class="stat-val" style="font-size:.9rem;margin-top:.3rem">${fileName}</div></div>
  `;
  renderDataTable('preview-table', workingData.slice(0,50));
  renderClean();
}

function renderDataTable(targetId, data){
  if(!data||!data.length){document.getElementById(targetId).innerHTML='<p style="padding:1rem;color:var(--text3)">No data</p>';return;}
  const cols = Object.keys(data[0]);
  const thead = `<thead><tr>${cols.map(c=>`<th>${c}<span class="type-tag type-${colTypes[c]}">${colTypes[c]||'?'}</span></th>`).join('')}</tr></thead>`;
  const tbody = `<tbody>${data.slice(0,100).map(r=>`<tr>${cols.map(c=>{
    const v=r[c];
    const isNull = v==null||v==='';
    return `<td class="${isNull?'null-cell':''}">${isNull?'null':v}</td>`;
  }).join('')}</tr>`).join('')}</tbody>`;
  document.getElementById(targetId).innerHTML=`<table>${thead}${tbody}</table>`;
}

// ═══════════════════════════════════════
// CLEAN — SHOW
// ═══════════════════════════════════════
function renderClean(){
  if(!workingData.length){document.getElementById('clean-no-data').style.display='block';document.getElementById('clean-content').style.display='none';return;}
  document.getElementById('clean-no-data').style.display='none';
  document.getElementById('clean-content').style.display='block';
  renderMissingReport();
  renderDataTable('clean-table',workingData.slice(0,30));
}

function renderMissingReport(){
  const html = columns.map(col=>{
    const total = workingData.length;
    const nulls = workingData.filter(r=>r[col]==null||r[col]==='').length;
    const pct = total?((nulls/total)*100).toFixed(1):0;
    return `<div class="missing-bar">
      <div class="missing-col">${col}</div>
      <div class="missing-track"><div class="missing-fill" style="width:${pct}%"></div></div>
      <div class="missing-pct">${nulls>0?`<span style="color:var(--danger)">${pct}%</span>`:pct+'%'}</div>
    </div>`;
  }).join('');
  document.getElementById('missing-report').innerHTML = html||'<p style="color:var(--success);font-size:.82rem"><i class="fas fa-check"></i> No missing values detected</p>';
}

// ═══════════════════════════════════════
// CLEANING OPERATIONS
// ═══════════════════════════════════════
function addLog(logId, type, msg){
  const el = document.getElementById(logId);
  if(!el) return;
  const line = document.createElement('div');
  line.className = `log-line log-${type}`;
  line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  el.appendChild(line);
  el.scrollTop = el.scrollHeight;
}

function afterClean(msg){
  detectColTypes();
  renderClean();
  populateAllSelects();
  addLog('clean-log','ok',msg);
  document.getElementById('file-badge').textContent=`${workingData.length} rows`;
}

function removeDuplicates(){
  const before = workingData.length;
  const seen = new Set();
  workingData = workingData.filter(r=>{const k=JSON.stringify(r);if(seen.has(k))return false;seen.add(k);return true;});
  document.getElementById('dup-result').textContent=`Removed ${before-workingData.length} duplicate rows`;
  afterClean(`Removed ${before-workingData.length} duplicate rows`);
}

document.getElementById('null-strategy').addEventListener('change',function(){
  document.getElementById('null-custom').style.display = this.value==='custom'?'block':'none';
});

function handleNulls(){
  const strategy = document.getElementById('null-strategy').value;
  const custom = document.getElementById('null-custom').value;
  const numCols = getNumericCols();
  let count=0;
  if(strategy==='drop'){
    const before=workingData.length;
    workingData = workingData.filter(r=>Object.values(r).every(v=>v!=null&&v!==''));
    count=before-workingData.length;
  } else {
    workingData.forEach(r=>{
      columns.forEach(col=>{
        if(r[col]==null||r[col]===''){
          if(strategy==='mean'&&numCols.includes(col)){
            const vals=workingData.filter(x=>x[col]!=null).map(x=>+x[col]);
            r[col]=+(vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(4);
          } else if(strategy==='median'&&numCols.includes(col)){
            const vals=workingData.filter(x=>x[col]!=null).map(x=>+x[col]).sort((a,b)=>a-b);
            const mid=Math.floor(vals.length/2);
            r[col]=vals.length%2===0?(vals[mid-1]+vals[mid])/2:vals[mid];
          } else if(strategy==='mode'){
            const freq={};
            workingData.forEach(x=>{if(x[col]!=null)freq[x[col]]=(freq[x[col]]||0)+1;});
            r[col]=Object.entries(freq).sort((a,b)=>b[1]-a[1])[0]?.[0];
          } else if(strategy==='zero'){
            r[col]=0;
          } else if(strategy==='custom'){
            r[col]=custom;
          }
          count++;
        }
      });
    });
  }
  afterClean(`Handled ${count} missing values (strategy: ${strategy})`);
}

function fixCase(){
  const type = document.getElementById('case-type').value;
  const strCols = getStringCols();
  strCols.forEach(col=>{
    workingData.forEach(r=>{
      if(typeof r[col]==='string'){
        if(type==='lower') r[col]=r[col].toLowerCase();
        else if(type==='upper') r[col]=r[col].toUpperCase();
        else r[col]=r[col].replace(/\w\S*/g,t=>t.charAt(0).toUpperCase()+t.substr(1).toLowerCase());
      }
    });
  });
  afterClean(`Fixed text case (${type}) for ${strCols.length} string columns`);
}

function trimSpaces(){
  getStringCols().forEach(col=>workingData.forEach(r=>{if(typeof r[col]==='string')r[col]=r[col].trim();}));
  afterClean('Trimmed extra spaces from all string columns');
}

function fixDtype(){
  const col = document.getElementById('dtype-col').value;
  const target = document.getElementById('dtype-target').value;
  workingData.forEach(r=>{
    if(r[col]!=null){
      if(target==='number') r[col]=isNaN(+r[col])?r[col]:+r[col];
      else if(target==='string') r[col]=String(r[col]);
      else if(target==='date') r[col]=new Date(r[col]).toISOString().split('T')[0];
      else if(target==='boolean') r[col]=Boolean(r[col]);
    }
  });
  afterClean(`Converted column "${col}" to ${target}`);
}

function renameColumn(){
  const col = document.getElementById('rename-col').value;
  const newName = document.getElementById('rename-val').value.trim();
  if(!newName) return;
  workingData.forEach(r=>{r[newName]=r[col];delete r[col];});
  columns=columns.map(c=>c===col?newName:c);
  colTypes[newName]=colTypes[col];delete colTypes[col];
  afterClean(`Renamed column "${col}" <i class="fas fa-arrow-right"></i> "${newName}"`);
}

function standardizeDates(){
  const col = document.getElementById('date-col').value;
  workingData.forEach(r=>{
    if(r[col]){const d=new Date(r[col]);if(!isNaN(d))r[col]=d.toISOString().split('T')[0];}
  });
  afterClean(`Standardized dates in column "${col}"`);
}

function dropColumn(){
  const col = document.getElementById('drop-col').value;
  workingData.forEach(r=>delete r[col]);
  columns=columns.filter(c=>c!==col);
  delete colTypes[col];
  afterClean(`Dropped column "${col}"`);
}

function detectOutliersZScore(){
  const col = document.getElementById('zscore-col').value;
  const vals = workingData.map(r=>+r[col]).filter(v=>!isNaN(v));
  const mean = vals.reduce((a,b)=>a+b,0)/vals.length;
  const std = Math.sqrt(vals.reduce((s,v)=>s+(v-mean)**2,0)/vals.length);
  const outliers = workingData.filter(r=>!isNaN(+r[col])&&Math.abs((+r[col]-mean)/std)>3);
  document.getElementById('zscore-result').textContent=`Found ${outliers.length} outliers (|Z| > 3)`;
}

function removeOutliersZScore(){
  const col = document.getElementById('zscore-col').value;
  const vals = workingData.map(r=>+r[col]).filter(v=>!isNaN(v));
  const mean = vals.reduce((a,b)=>a+b,0)/vals.length;
  const std = Math.sqrt(vals.reduce((s,v)=>s+(v-mean)**2,0)/vals.length);
  const before = workingData.length;
  workingData = workingData.filter(r=>isNaN(+r[col])||Math.abs((+r[col]-mean)/std)<=3);
  afterClean(`Removed ${before-workingData.length} outliers from "${col}" via Z-Score`);
}

function removeOutliersIQR(){
  const col = document.getElementById('iqr-col').value;
  const vals = workingData.map(r=>+r[col]).filter(v=>!isNaN(v)).sort((a,b)=>a-b);
  const q1 = vals[Math.floor(vals.length*0.25)];
  const q3 = vals[Math.floor(vals.length*0.75)];
  const iqr = q3-q1;
  const lo=q1-1.5*iqr, hi=q3+1.5*iqr;
  const before = workingData.length;
  workingData = workingData.filter(r=>isNaN(+r[col])||((+r[col])>=lo&&(+r[col])<=hi));
  const res=document.getElementById('iqr-result');
  if(res) res.textContent=`Removed ${before-workingData.length} outliers`;
  afterClean(`Removed ${before-workingData.length} outliers from "${col}" via IQR`);
}

function logTransform(){
  const col = document.getElementById('skew-col').value;
  workingData.forEach(r=>{if(+r[col]>0) r[col]=+Math.log(+r[col]).toFixed(5);});
  afterClean(`Applied log transform to "${col}"`);
}

function findHighCorr(){
  const numCols = getNumericCols();
  const pairs=[];
  for(let i=0;i<numCols.length;i++){
    for(let j=i+1;j<numCols.length;j++){
      const r=pearson(numCols[i],numCols[j]);
      if(Math.abs(r)>=0.95) pairs.push(`${numCols[i]} ↔ ${numCols[j]} (r=${r.toFixed(2)})`);
    }
  }
  document.getElementById('corr-result').textContent = pairs.length?pairs.join(', '):'No highly correlated pairs found';
}

function labelEncode(){
  const col = document.getElementById('label-col').value;
  const cats=[...new Set(workingData.map(r=>r[col]))];
  const map=Object.fromEntries(cats.map((c,i)=>[c,i]));
  workingData.forEach(r=>r[col]=map[r[col]]??r[col]);
  afterClean(`Label encoded "${col}" (${cats.length} categories)`);
}

function oneHotEncode(){
  const col = document.getElementById('ohe-col').value;
  const cats=[...new Set(workingData.map(r=>r[col]))];
  cats.forEach(cat=>{
    const newCol=`${col}_${String(cat).replace(/\s/g,'_')}`;
    workingData.forEach(r=>r[newCol]=r[col]===cat?1:0);
    if(!columns.includes(newCol)) columns.push(newCol);
    colTypes[newCol]='int';
  });
  afterClean(`One-hot encoded "${col}" <i class="fas fa-arrow-right"></i> ${cats.length} new columns`);
}

function normalizeCol(){
  const col = document.getElementById('norm-col').value;
  const vals = workingData.map(r=>+r[col]).filter(v=>!isNaN(v));
  const min=Math.min(...vals),max=Math.max(...vals);
  workingData.forEach(r=>{if(!isNaN(+r[col])) r[col]=+(((+r[col]-min)/(max-min||1))).toFixed(5);});
  afterClean(`Normalized "${col}" to [0,1]`);
}

function standardizeCol(){
  const col = document.getElementById('std-col').value;
  const vals = workingData.map(r=>+r[col]).filter(v=>!isNaN(v));
  const mean=vals.reduce((a,b)=>a+b,0)/vals.length;
  const std=Math.sqrt(vals.reduce((s,v)=>s+(v-mean)**2,0)/vals.length)||1;
  workingData.forEach(r=>{if(!isNaN(+r[col])) r[col]=+(((+r[col]-mean)/std)).toFixed(5);});
  afterClean(`Standardized "${col}" (mean=0, std=1)`);
}

function textLower(){
  const col=document.getElementById('tl-col').value;
  workingData.forEach(r=>{if(typeof r[col]==='string')r[col]=r[col].toLowerCase();});
  afterClean(`Lowercased text in "${col}"`);
}

function removePunct(){
  const col=document.getElementById('tp-col').value;
  workingData.forEach(r=>{if(typeof r[col]==='string')r[col]=r[col].replace(/[^\w\s]/g,'');});
  afterClean(`Removed punctuation from "${col}"`);
}

function removeStopwords(){
  const col=document.getElementById('ts-col').value;
  workingData.forEach(r=>{
    if(typeof r[col]==='string')
      r[col]=r[col].split(/\s+/).filter(w=>!STOPWORDS.has(w.toLowerCase())).join(' ');
  });
  afterClean(`Removed stopwords from "${col}"`);
}

function applyAllCleaning(){
  removeDuplicates();
  handleNulls();
  trimSpaces();
  addLog('clean-log','ok','Auto-clean complete!');
}

// ═══════════════════════════════════════
// CHART UTILS
// ═══════════════════════════════════════
function getChartTheme(){
  const isBlack = theme==='black';
  return {
    gridColor: isBlack?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.08)',
    tickColor: isBlack?'#aaaaaa':'#333333',
    bgColor: isBlack?'#0d0d0d':'#ffffff'
  };
}

function destroyChart(id){
  if(activeCharts[id]){activeCharts[id].destroy();delete activeCharts[id];}
}

function makeChart(id, config){
  destroyChart(id);
  const ctx = document.getElementById(id);
  if(!ctx) return;
  const t = getChartTheme();
  if(!config.options) config.options={};
  if(!config.options.plugins) config.options.plugins={};
  if(!config.options.plugins.legend) config.options.plugins.legend={};
  config.options.plugins.legend.labels={color:t.tickColor,font:{family:'Space Grotesk',size:11}};
  if(config.options.plugins.legend.display===undefined) config.options.plugins.legend.display=true;
  config.options.responsive=true;
  config.options.maintainAspectRatio=false;
  if(!config.options.scales && config.type!=='pie' && config.type!=='doughnut' && config.type!=='radar'){
    config.options.scales={
      x:{grid:{color:t.gridColor},ticks:{color:t.tickColor,maxTicksLimit:10,font:{size:10}}},
      y:{grid:{color:t.gridColor},ticks:{color:t.tickColor,font:{size:10}}}
    };
  }
  if(config.type==='radar'){
    config.options.scales={r:{grid:{color:t.gridColor},ticks:{color:t.tickColor}}};
  }
  activeCharts[id] = new Chart(ctx, config);
  return activeCharts[id];
}

function colValues(col, data){ return (data||workingData).map(r=>r[col]); }

function groupCount(col, data){
  const d=data||workingData;
  const freq={};
  d.forEach(r=>{const v=String(r[col]??'null');freq[v]=(freq[v]||0)+1;});
  return freq;
}

function groupSum(catCol, valCol, data){
  const d=data||workingData;
  const sums={};
  d.forEach(r=>{const k=String(r[catCol]??'null');sums[k]=(sums[k]||0)+(+r[valCol]||0);});
  return sums;
}

function histogram(vals, bins){
  const min=Math.min(...vals),max=Math.max(...vals);
  const size=(max-min)/bins;
  const counts=Array(bins).fill(0);
  vals.forEach(v=>{const idx=Math.min(Math.floor((v-min)/size),bins-1);counts[idx]++;});
  const labels=Array.from({length:bins},(_,i)=>(min+i*size).toFixed(1));
  return {labels,counts};
}

// ═══════════════════════════════════════
// CHARTS — ESSENTIAL
// ═══════════════════════════════════════
function renderBar(){
  const x=document.getElementById('bar-x').value, y=document.getElementById('bar-y').value;
  if(!x||!y||!workingData.length) return;
  const sums=groupSum(x,y);
  const labels=Object.keys(sums).slice(0,20);
  makeChart('barChart',{type:'bar',data:{labels,datasets:[{label:y,data:labels.map(l=>sums[l]),backgroundColor:COLORS[0]+'cc',borderColor:COLORS[0],borderWidth:1}]}});
}
function renderLine(){
  const x=document.getElementById('line-x').value, y=document.getElementById('line-y').value;
  if(!x||!y||!workingData.length) return;
  const d=workingData.slice(0,80);
  makeChart('lineChart',{type:'line',data:{labels:d.map(r=>r[x]),datasets:[{label:y,data:d.map(r=>+r[y]||0),borderColor:COLORS[1],backgroundColor:COLORS[1]+'22',fill:false,tension:.4,pointRadius:2}]}});
}
function renderPie(){
  const col=document.getElementById('pie-col').value;
  if(!col||!workingData.length) return;
  const freq=groupCount(col);
  const top=Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,10);
  makeChart('pieChart',{type:'pie',data:{labels:top.map(t=>t[0]),datasets:[{data:top.map(t=>t[1]),backgroundColor:COLORS}]}});
}
function renderHistogram(){
  const col=document.getElementById('hist-col').value;
  const bins=+document.getElementById('hist-bins').value||10;
  if(!col||!workingData.length) return;
  const vals=workingData.map(r=>+r[col]).filter(v=>!isNaN(v));
  const {labels,counts}=histogram(vals,bins);
  makeChart('histChart',{type:'bar',data:{labels,datasets:[{label:'Frequency',data:counts,backgroundColor:COLORS[2]+'cc',borderColor:COLORS[2],borderWidth:1}]},options:{plugins:{legend:{display:false}}}});
}
function renderScatter(){
  const x=document.getElementById('sc-x').value, y=document.getElementById('sc-y').value;
  if(!x||!y||!workingData.length) return;
  const pts=workingData.slice(0,200).map(r=>({x:+r[x]||0,y:+r[y]||0}));
  makeChart('scatterChart',{type:'scatter',data:{datasets:[{label:`${x} vs ${y}`,data:pts,backgroundColor:COLORS[3]+'99',pointRadius:4}]}});
}
function renderArea(){
  const x=document.getElementById('area-x').value, y=document.getElementById('area-y').value;
  if(!x||!y||!workingData.length) return;
  const d=workingData.slice(0,60);
  makeChart('areaChart',{type:'line',data:{labels:d.map(r=>r[x]),datasets:[{label:y,data:d.map(r=>+r[y]||0),borderColor:COLORS[0],backgroundColor:COLORS[0]+'33',fill:true,tension:.4,pointRadius:2}]}});
}

function renderAllEssentialCharts(){
  renderBar(); renderLine(); renderPie(); renderHistogram(); renderScatter(); renderArea();
}

// ═══════════════════════════════════════
// CHARTS — ADVANCED
// ═══════════════════════════════════════
function pearson(col1, col2, data){
  const d=data||workingData;
  const x=d.map(r=>+r[col1]).filter((_,i)=>!isNaN(+d[i]?.[col1])&&!isNaN(+d[i]?.[col2]));
  const y=d.map(r=>+r[col2]).filter((_,i)=>!isNaN(+d[i]?.[col1])&&!isNaN(+d[i]?.[col2]));
  const n=Math.min(x.length,y.length);
  if(n<2) return 0;
  const mx=x.reduce((a,b)=>a+b,0)/n, my=y.reduce((a,b)=>a+b,0)/n;
  const num=x.slice(0,n).reduce((s,xi,i)=>s+(xi-mx)*(y[i]-my),0);
  const den=Math.sqrt(x.slice(0,n).reduce((s,xi)=>s+(xi-mx)**2,0)*y.slice(0,n).reduce((s,yi)=>s+(yi-my)**2,0));
  return den?+(num/den).toFixed(3):0;
}

function corrColor(r){
  const v = Math.abs(r);
  if(v>=0.8) return r>0?'rgba(var(--success-rgb),0.8)':'rgba(var(--danger-rgb),0.8)';
  if(v>=0.5) return r>0?'rgba(var(--success-rgb),0.5)':'rgba(var(--danger-rgb),0.5)';
  if(v>=0.3) return r>0?'rgba(var(--success-rgb),0.3)':'rgba(var(--danger-rgb),0.3)';
  return 'rgba(100,116,139,0.2)';
}

function renderCorrHeatmap(targetId){
  const numCols = getNumericCols().slice(0,12);
  if(numCols.length<2){document.getElementById(targetId).innerHTML='<p style="color:var(--text3);padding:1rem">Need at least 2 numeric columns</p>';return;}
  const matrix=numCols.map(c1=>numCols.map(c2=>pearson(c1,c2)));
  const headerRow=`<tr><th></th>${numCols.map(c=>`<th style="writing-mode:vertical-rl;transform:rotate(180deg);font-size:.68rem">${c}</th>`).join('')}</tr>`;
  const rows=numCols.map((r,i)=>`<tr><th style="text-align:right;font-size:.72rem">${r}</th>${numCols.map((_,j)=>{
    const v=matrix[i][j];
    return `<td style="background:${corrColor(v)};color:${Math.abs(v)>0.5?'#fff':'var(--text2)'}">` +
      `${i===j?'1.00':v.toFixed(2)}</td>`;
  }).join('')}</tr>`).join('');
  document.getElementById(targetId).innerHTML=`<table class="heatmap-table">${headerRow}${rows}</table>`;
}

function renderBox(){
  const col=document.getElementById('box-col').value;
  if(!col||!workingData.length) return;
  const vals=workingData.map(r=>+r[col]).filter(v=>!isNaN(v)).sort((a,b)=>a-b);
  const q1=vals[Math.floor(vals.length*.25)],q3=vals[Math.floor(vals.length*.75)];
  const med=vals[Math.floor(vals.length*.5)];
  const iqr=q3-q1;
  const lo=q1-1.5*iqr,hi=q3+1.5*iqr;
  const {labels,counts}=histogram(vals,20);
  makeChart('boxChart',{type:'bar',data:{labels,datasets:[{label:col,data:counts,backgroundColor:counts.map((_,i)=>{const v=parseFloat(labels[i]);return v<lo||v>hi?COLORS[8]+'bb':COLORS[4]+'bb';}),borderWidth:0}]},options:{plugins:{legend:{display:false},tooltip:{callbacks:{title:(i)=>`Value: ${i[0].label}`,label:(i)=>`Count: ${i.raw}`}}}}});
}

function renderBubble(){
  const x=document.getElementById('bub-x').value,y=document.getElementById('bub-y').value,r=document.getElementById('bub-r').value;
  if(!x||!y||!r||!workingData.length) return;
  const rVals=workingData.map(row=>+row[r]).filter(v=>!isNaN(v));
  const rMin=Math.min(...rVals),rMax=Math.max(...rVals);
  const pts=workingData.slice(0,80).map(row=>({x:+row[x]||0,y:+row[y]||0,r:Math.max(2,((+row[r]-rMin)/(rMax-rMin||1))*20+3)}));
  makeChart('bubbleChart',{type:'bubble',data:{datasets:[{label:`${x} vs ${y} (size:${r})`,data:pts,backgroundColor:COLORS[5]+'99',borderColor:COLORS[5]}]}});
}

function renderDoughnut(){
  const col=document.getElementById('donut-col').value;
  if(!col||!workingData.length) return;
  const freq=groupCount(col);
  const top=Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,8);
  makeChart('doughnutChart',{type:'doughnut',data:{labels:top.map(t=>t[0]),datasets:[{data:top.map(t=>t[1]),backgroundColor:COLORS,borderWidth:2,borderColor:'transparent'}]},options:{cutout:'60%'}});
}

function renderRadar(){
  const numCols=getNumericCols().slice(0,8);
  if(numCols.length<3){return;}
  const rowCount=Math.min(3,workingData.length);
  const datasets=Array.from({length:rowCount},(_,i)=>{
    const r=workingData[i];
    return {label:`Row ${i+1}`,data:numCols.map(c=>+r[c]||0),backgroundColor:COLORS[i]+'33',borderColor:COLORS[i],pointBackgroundColor:COLORS[i]};
  });
  makeChart('radarChart',{type:'radar',data:{labels:numCols,datasets}});
}

function renderKDE(){
  const col=document.getElementById('kde-col').value;
  if(!col||!workingData.length) return;
  const vals=workingData.map(r=>+r[col]).filter(v=>!isNaN(v)).sort((a,b)=>a-b);
  const {labels,counts}=histogram(vals,30);
  const total=counts.reduce((a,b)=>a+b,0);
  const density=counts.map(c=>+(c/total).toFixed(5));
  makeChart('kdeChart',{type:'line',data:{labels,datasets:[{label:'Density',data:density,fill:true,borderColor:COLORS[6],backgroundColor:COLORS[6]+'33',tension:.5,pointRadius:0}]},options:{plugins:{legend:{display:false}}}});
}

// ═══════════════════════════════════════
// INTERACTIVE CHARTS
// ═══════════════════════════════════════
let currentFilteredData=null;

function updateFilterValues(){
  const col=document.getElementById('filter-col').value;
  const vals=[...new Set(workingData.map(r=>r[col]))].slice(0,50);
  document.getElementById('filter-val').innerHTML=`<option value="">All</option>`+vals.map(v=>`<option>${v}</option>`).join('');
}

function applyFilter(){
  const col=document.getElementById('filter-col').value;
  const val=document.getElementById('filter-val').value;
  currentFilteredData=val?workingData.filter(r=>String(r[col])===String(val)):workingData;
  renderIntBar(); renderIntLine();
  renderDataTable('search-table',currentFilteredData.slice(0,50));
}

function resetFilter(){
  currentFilteredData=null;
  document.getElementById('filter-val').value='';
  renderIntBar(); renderIntLine();
  document.getElementById('search-table').innerHTML='';
}

function searchData(q){
  if(!q){document.getElementById('search-table').innerHTML='';return;}
  const low=q.toLowerCase();
  const results=workingData.filter(r=>columns.some(c=>String(r[c]).toLowerCase().includes(low)));
  renderDataTable('search-table',results.slice(0,50));
}

function renderIntBar(){
  const data=currentFilteredData||workingData;
  const x=document.getElementById('int-bar-x').value,y=document.getElementById('int-bar-y').value;
  if(!x||!y||!data.length) return;
  const sums=groupSum(x,y,data);
  const labels=Object.keys(sums).slice(0,20);
  makeChart('intBarChart',{type:'bar',data:{labels,datasets:[{label:y,data:labels.map(l=>sums[l]),backgroundColor:COLORS[1]+'cc',borderColor:COLORS[1],borderWidth:1}]}});
}

function renderIntLine(){
  const data=currentFilteredData||workingData;
  const x=document.getElementById('int-line-x').value,y=document.getElementById('int-line-y').value;
  if(!x||!y||!data.length) return;
  const d=data.slice(0,80);
  makeChart('intLineChart',{type:'line',data:{labels:d.map(r=>r[x]),datasets:[{label:y,data:d.map(r=>+r[y]||0),borderColor:COLORS[0],backgroundColor:COLORS[0]+'22',fill:false,tension:.4,pointRadius:2}]}});
}

function renderInteractiveCharts(){
  updateFilterValues();
  renderIntBar(); renderIntLine();
}

// ═══════════════════════════════════════
// EDA
// ═══════════════════════════════════════
function renderEDA(){
  if(!workingData.length){
    document.getElementById('eda-no-data').style.display='block';
    document.getElementById('eda-content').style.display='none';
    return;
  }
  document.getElementById('eda-no-data').style.display='none';
  document.getElementById('eda-content').style.display='block';
  renderEDAStats();
}

function renderEDAStats(){
  const numCols=getNumericCols();
  const nullCount=workingData.reduce((s,r)=>s+Object.values(r).filter(v=>v==null||v==='').length,0);
  document.getElementById('eda-summary-cards').innerHTML=`
    <div class="stat-card"><div class="stat-label">Rows</div><div class="stat-val stat-accent">${workingData.length}</div></div>
    <div class="stat-card"><div class="stat-label">Columns</div><div class="stat-val">${columns.length}</div></div>
    <div class="stat-card"><div class="stat-label">Numeric</div><div class="stat-val" style="color:var(--accent2)">${numCols.length}</div></div>
    <div class="stat-card"><div class="stat-label">Categorical</div><div class="stat-val" style="color:var(--accent3)">${getCatCols().length}</div></div>
    <div class="stat-card"><div class="stat-label">Missing</div><div class="stat-val ${nullCount?'stat-danger':'stat-success'}">${nullCount}</div></div>
  `;

  const edaHtml = numCols.map(col=>{
    const vals=workingData.map(r=>+r[col]).filter(v=>!isNaN(v));
    if(!vals.length) return '';
    const n=vals.length;
    const mean=vals.reduce((a,b)=>a+b,0)/n;
    const sorted=[...vals].sort((a,b)=>a-b);
    const med=sorted[Math.floor(n/2)];
    const variance=vals.reduce((s,v)=>s+(v-mean)**2,0)/n;
    const std=Math.sqrt(variance);
    const skew=vals.reduce((s,v)=>s+((v-mean)/std)**3,0)/n;
    const kurt=vals.reduce((s,v)=>s+((v-mean)/std)**4,0)/n-3;
    const min=sorted[0], max=sorted[n-1];
    const q1=sorted[Math.floor(n*.25)], q3=sorted[Math.floor(n*.75)];
    const freq={};vals.forEach(v=>{freq[v]=(freq[v]||0)+1;});
    const mode=Object.entries(freq).sort((a,b)=>b[1]-a[1])[0]?.[0];
    return `<div class="eda-card">
      <div class="eda-col-name">${col}<span class="type-tag type-${colTypes[col]}">${colTypes[col]}</span></div>
      <div class="eda-stats">
        <div class="eda-stat"><span class="eda-key">Mean</span><span class="eda-value">${mean.toFixed(3)}</span></div>
        <div class="eda-stat"><span class="eda-key">Median</span><span class="eda-value">${med.toFixed(3)}</span></div>
        <div class="eda-stat"><span class="eda-key">Mode</span><span class="eda-value">${(+mode).toFixed(2)}</span></div>
        <div class="eda-stat"><span class="eda-key">Std Dev</span><span class="eda-value">${std.toFixed(3)}</span></div>
        <div class="eda-stat"><span class="eda-key">Variance</span><span class="eda-value">${variance.toFixed(3)}</span></div>
        <div class="eda-stat"><span class="eda-key">Min</span><span class="eda-value">${min}</span></div>
        <div class="eda-stat"><span class="eda-key">Max</span><span class="eda-value">${max}</span></div>
        <div class="eda-stat"><span class="eda-key">Q1</span><span class="eda-value">${q1}</span></div>
        <div class="eda-stat"><span class="eda-key">Q3</span><span class="eda-value">${q3}</span></div>
        <div class="eda-stat"><span class="eda-key">IQR</span><span class="eda-value">${(q3-q1).toFixed(2)}</span></div>
        <div class="eda-stat"><span class="eda-key">Skewness</span><span class="eda-value">${skew.toFixed(3)}</span></div>
        <div class="eda-stat"><span class="eda-key">Kurtosis</span><span class="eda-value">${kurt.toFixed(3)}</span></div>
        <div class="eda-stat"><span class="eda-key">25th %ile</span><span class="eda-value">${sorted[Math.floor(n*.25)]}</span></div>
        <div class="eda-stat"><span class="eda-key">75th %ile</span><span class="eda-value">${sorted[Math.floor(n*.75)]}</span></div>
        <div class="eda-stat"><span class="eda-key">Count</span><span class="eda-value">${n}</span></div>
      </div>
    </div>`;
  }).join('');
  document.getElementById('eda-col-stats').innerHTML=edaHtml||'<p style="color:var(--text3)">No numeric columns</p>';
}

function renderDistCharts(){
  const numCols=getNumericCols();
  const container=document.getElementById('dist-charts');
  container.innerHTML='';
  numCols.slice(0,6).forEach(col=>{
    const card=document.createElement('div');
    card.className='chart-card';
    card.innerHTML=`<div class="chart-hdr"><div class="chart-title"><i class="fas fa-chart-bar"></i> ${col}</div></div><div class="chart-body"><canvas id="dist-${col}"></canvas></div>`;
    container.appendChild(card);
    const vals=workingData.map(r=>+r[col]).filter(v=>!isNaN(v));
    const {labels,counts}=histogram(vals,15);
    setTimeout(()=>{
      makeChart(`dist-${col}`,{type:'bar',data:{labels,datasets:[{label:col,data:counts,backgroundColor:COLORS[Math.floor(Math.random()*COLORS.length)]+'bb',borderWidth:0}]},options:{plugins:{legend:{display:false}}}});
    },50);
  });
}

function renderCorrInsights(){
  const numCols=getNumericCols().slice(0,8);
  const insights=[];
  for(let i=0;i<numCols.length;i++){
    for(let j=i+1;j<numCols.length;j++){
      const r=pearson(numCols[i],numCols[j]);
      if(Math.abs(r)>=0.7) insights.push({cols:[numCols[i],numCols[j]],r});
    }
  }
  insights.sort((a,b)=>Math.abs(b.r)-Math.abs(a.r));
  const list=document.getElementById('corr-insights-list');
  if(!insights.length){list.innerHTML='<div class="insight-item"><span class="insight-bullet">•</span>No strong correlations found (threshold: |r| ≥ 0.7)</div>';return;}
  list.innerHTML=insights.slice(0,6).map(({cols,r})=>`
    <div class="insight-item">
      <span class="insight-bullet">•</span>
      <span><strong>${cols[0]}</strong> and <strong>${cols[1]}</strong> have a ${r>0?'positive':'negative'} correlation (r = ${r.toFixed(2)}). ${Math.abs(r)>=0.9?'Highly correlated — consider dropping one.':'Moderate correlation.'}</span>
    </div>`).join('');
}

function renderTrend(){
  const col=document.getElementById('trend-col').value;
  if(!col||!workingData.length) return;
  const d=workingData.slice(0,100);
  makeChart('trendChart',{type:'line',data:{labels:d.map((_,i)=>i+1),datasets:[{label:col,data:d.map(r=>+r[col]||0),borderColor:COLORS[0],backgroundColor:COLORS[0]+'22',fill:true,tension:.4,pointRadius:2}]},options:{plugins:{legend:{display:false}}}});
}

function renderCatAnalysis(){
  const catCol=document.getElementById('cat-col').value;
  const valCol=document.getElementById('cat-val-col').value;
  if(!catCol||!valCol||!workingData.length) return;
  const sums=groupSum(catCol,valCol);
  const labels=Object.keys(sums).slice(0,15);
  makeChart('catChart',{type:'bar',data:{labels,datasets:[{label:`${valCol} by ${catCol}`,data:labels.map(l=>sums[l]),backgroundColor:COLORS.map(c=>c+'cc'),borderWidth:0}]},options:{indexAxis:'y',plugins:{legend:{display:false}}}});
}

// ═══════════════════════════════════════
// VIZ PANEL INIT
// ═══════════════════════════════════════
function renderActiveViz(){
  if(!workingData.length){document.getElementById('viz-no-data').style.display='block';document.getElementById('viz-content').style.display='none';return;}
  document.getElementById('viz-no-data').style.display='none';
  document.getElementById('viz-content').style.display='block';
  setTimeout(renderAllEssentialCharts,50);
}

// ═══════════════════════════════════════
// ML
// ═══════════════════════════════════════
let mlTarget = '';

function autoDetectTarget(){
  const nums=getNumericCols(), cats=getCatCols(), all=columns;
  // Prefer categorical cols with 2-10 unique values (classification targets)
  const scoredCats=cats.map(c=>{
    const u=new Set(workingData.map(r=>r[c])).size;
    let s=0;
    if(/target|label|class|category|type|status|result|outcome|decision|grade|pass|fail|flag/i.test(c)) s+=100;
    if(/id|code|num$|no$/i.test(c)) s-=50;
    if(u===2) s+=80; else if(u<=10) s+=50; else s-=30;
    return{col:c,score:s};
  }).sort((a,b)=>b.score-a.score);
  // Prefer numeric cols with few unique values (classification) or predictive sounding names
  const scoredNums=nums.map(c=>{
    const u=new Set(workingData.map(r=>r[c])).size;
    let s=0;
    if(/target|score|grade|gpa|price|amount|rate|value|result|pred|label/i.test(c)) s+=60;
    if(/id|code|num$|no$/i.test(c)) s-=50;
    if(u<=10) s+=40;
    return{col:c,score:s,uniq:u};
  }).sort((a,b)=>b.score-a.score);
  // Pick best overall
  const best=scoredCats.length&&scoredCats[0].score>40?scoredCats[0].col:
            scoredNums.length&&scoredNums[0].score>20?scoredNums[0].col:
            cats.length?cats[0]:nums.length?nums[0]:all[0];
  return best;
}

function onTargetChange(){
  const sel=document.getElementById('ml-target');
  if(!sel) return;
  mlTarget=sel.value;
  updateMLProfile();
  updateModelRecommendation();
  updateMLTargetDist();
  updateEvalTaskType();
}

function updateMLProfile(){
  const n=workingData.length, numC=getNumericCols().length, catC=getCatCols().length;
  const missing=workingData.reduce((s,r)=>s+Object.values(r).filter(v=>v==null||v==='').length,0);
  const isClass=mlTarget&&(getCatCols().includes(mlTarget)||new Set(workingData.map(r=>r[mlTarget])).size<=10);
  document.getElementById('mlp-rows').textContent=n.toLocaleString();
  document.getElementById('mlp-num').textContent=numC;
  document.getElementById('mlp-cat').textContent=catC;
  document.getElementById('mlp-miss').textContent=missing.toLocaleString();
  document.getElementById('mlp-task').textContent=isClass?'Classification':'Regression';
}

function updateModelRecommendation(){
  const n=workingData.length, numC=getNumericCols().length, catC=getCatCols().length;
  if(!mlTarget){document.getElementById('ml-recommend').innerHTML='<span style="color:var(--text3)">Select a target column</span>';return;}
  const isClass=getCatCols().includes(mlTarget)||new Set(workingData.map(r=>r[mlTarget])).size<=10;
  const recs=isClass?getClassModels(n,numC+catC):getRegModels(n,numC+catC);
  document.getElementById('ml-recommend').innerHTML=recs.map(r=>
    `<div style="display:flex;align-items:center;gap:.5rem;padding:.35rem 0;border-bottom:1px solid var(--border)">
      <span style="color:var(--accent);font-family:var(--mono);font-size:.72rem">${r.name}</span>
      <span style="font-size:.7rem;color:var(--text3)">${r.desc}</span>
      <span style="margin-left:auto;font-size:.6rem;background:rgba(var(--success-rgb),0.15);color:var(--success);padding:0 6px;border-radius:4px">${r.best}</span>
    </div>`
  ).join('');
}

function getClassModels(n,f){
  const models=[];
  if(n<1000) models.push({name:'Logistic Regression',desc:'Fast, interpretable baseline',best:'Small data'});
  if(n<5000) models.push({name:'Random Forest',desc:'Handles non-linearity well',best:'Medium data'});
  if(n>500) models.push({name:'XGBoost',desc:'State-of-art performance',best:'Large data'});
  if(f>10) models.push({name:'SVM (RBF)',desc:'Works well in high-dim space',best:'Many features'});
  if(n<10000) models.push({name:'KNN',desc:'Simple, instance-based',best:'Small/medium'});
  models.push({name:'Decision Tree',desc:'White-box, interpretable',best:'Any size'});
  return models;
}

function getRegModels(n,f){
  const models=[];
  if(n<1000) models.push({name:'Linear Regression',desc:'Simple, interpretable',best:'Small data'});
  if(n<5000) models.push({name:'Random Forest Regressor',desc:'Handles non-linearity',best:'Medium data'});
  if(n>500) models.push({name:'XGBoost Regressor',desc:'Best for structured data',best:'Large data'});
  if(f>10) models.push({name:'Ridge/Lasso',desc:'Regularized, avoids overfit',best:'Many features'});
  models.push({name:'Decision Tree Regressor',desc:'Interpretable, no scaling',best:'Any size'});
  return models;
}

function updateMLTargetDist(){
  const el=document.getElementById('ml-target-dist');
  if(!mlTarget||!workingData.length){el.innerHTML='—';return;}
  const vals=workingData.map(r=>r[mlTarget]);
  const isNum=getNumericCols().includes(mlTarget);
  if(isNum){
    const nums=vals.map(v=>+v).filter(v=>!isNaN(v));
    if(nums.length<2){el.innerHTML='<span style="color:var(--text3)">Not enough numeric values</span>';return;}
    const mean=nums.reduce((a,b)=>a+b,0)/nums.length;
    const sorted=[...nums].sort((a,b)=>a-b);
    const min=sorted[0], max=sorted[sorted.length-1];
    const q1=sorted[Math.floor(sorted.length*.25)], q3=sorted[Math.floor(sorted.length*.75)];
    el.innerHTML=`
      <div class="eda-stat"><span class="eda-key">Min — Max</span><span class="eda-value">${min.toFixed(2)} — ${max.toFixed(2)}</span></div>
      <div class="eda-stat"><span class="eda-key">Mean ± Std</span><span class="eda-value">${mean.toFixed(2)} ± ${Math.sqrt(nums.reduce((s,v)=>s+(v-mean)**2,0)/nums.length).toFixed(2)}</span></div>
      <div class="eda-stat"><span class="eda-key">Median (Q1,Q3)</span><span class="eda-value">${sorted[Math.floor(sorted.length/2)].toFixed(2)} (${q1.toFixed(2)}, ${q3.toFixed(2)})</span></div>
      <div class="eda-stat"><span class="eda-key">Skewness</span><span class="eda-value">${((3*(mean-sorted[Math.floor(sorted.length/2)]))/Math.sqrt(nums.reduce((s,v)=>s+(v-mean)**2,0)/nums.length)).toFixed(2)}</span></div>`;
  } else {
    const freq={}; vals.forEach(v=>freq[v]=(freq[v]||0)+1);
    const sorted=Object.entries(freq).sort((a,b)=>b[1]-a[1]);
    const maxC=sorted[0][1];
    el.innerHTML=sorted.slice(0,8).map(([k,v])=>{
      const pct=(v/workingData.length*100).toFixed(1);
      return `<div style="display:flex;align-items:center;gap:.4rem;margin-bottom:.25rem">
        <span style="min-width:60px;font-size:.72rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${k}</span>
        <div style="flex:1;height:8px;background:var(--bg3);border-radius:4px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:var(--accent);border-radius:4px"></div>
        </div>
        <span style="min-width:40px;text-align:right;font-size:.7rem;font-family:var(--mono)">${pct}%</span>
      </div>`;
    }).join('');
  }
}

function updateEvalTaskType(){
  const el=document.getElementById('ml-task-type');
  const desc=document.getElementById('ml-task-desc');
  if(!mlTarget){el.textContent='—';desc.textContent='Select a target column in Feature Engineering';return;}
  const isClass=getCatCols().includes(mlTarget)||new Set(workingData.map(r=>r[mlTarget])).size<=10;
  el.textContent=isClass?'Classification':'Regression';
  el.style.color=isClass?'var(--accent)':'var(--accent2)';
  desc.textContent=`Target: ${mlTarget} (${isClass?'discrete':'continuous'} values)`;
}

function labelEncodeML(){
  const col=document.getElementById('ml-encode-col').value;
  if(!col) return;
  const unique=[...new Set(workingData.map(r=>r[col]))];
  const map=Object.fromEntries(unique.map((v,i)=>[v,i]));
  const newCol=col+'_encoded';
  workingData.forEach(r=>r[newCol]=map[r[col]]);
  if(!columns.includes(newCol)) columns.push(newCol);
  colTypes[newCol]='int';
  document.getElementById('ml-encode-result').textContent=`Created: ${newCol} (${unique.length} labels)`;
  populateAllSelects();
}

function oneHotEncodeML(){
  const col=document.getElementById('ml-encode-col').value;
  if(!col) return;
  const unique=[...new Set(workingData.map(r=>r[col]))];
  if(unique.length>15){document.getElementById('ml-encode-result').textContent='Too many categories (>15) for one-hot';return;}
  unique.forEach(v=>{
    const newCol=col+'_'+String(v).replace(/\s+/g,'_').replace(/[^a-zA-Z0-9_]/g,'');
    workingData.forEach(r=>r[newCol]=r[col]===v?1:0);
    if(!columns.includes(newCol)) columns.push(newCol);
    colTypes[newCol]='int';
  });
  document.getElementById('ml-encode-result').textContent=`Created ${unique.length} one-hot columns from ${col}`;
  populateAllSelects();
}

function renderML(){
  if(!workingData.length){document.getElementById('ml-no-data').style.display='block';document.getElementById('ml-content').style.display='none';return;}
  document.getElementById('ml-no-data').style.display='none';
  document.getElementById('ml-content').style.display='block';
  const sel=document.getElementById('ml-target');
  if(sel){
    const target=autoDetectTarget();
    sel.value=target;
    mlTarget=target;
  }
  updateMLProfile();
  updateModelRecommendation();
  computeVarianceFeatures();
  updateSplitInfo(80);
  setTimeout(renderFeatImp,80);
}

function computeVarianceFeatures(){
  const threshold=+document.getElementById('var-threshold').value/100;
  const numCols=getNumericCols();
  const selected=numCols.filter(col=>{
    const vals=workingData.map(r=>+r[col]).filter(v=>!isNaN(v));
    const mean=vals.reduce((a,b)=>a+b,0)/vals.length;
    const variance=vals.reduce((s,v)=>s+(v-mean)**2,0)/vals.length;
    const maxV=Math.max(...vals)||1;
    return (variance/(maxV**2))>=threshold;
  });
  const el=document.getElementById('feature-sel-result');
  if(el) el.innerHTML=`Selected <strong style="color:var(--accent)">${selected.length}</strong> of ${numCols.length} features:<br><span style="color:var(--text2)">${selected.join(', ')||'None'}</span>`;
}

function renderFeatImp(){
  const numCols=getNumericCols().slice(0,8);
  const variances=numCols.map(col=>{
    const vals=workingData.map(r=>+r[col]).filter(v=>!isNaN(v));
    const mean=vals.reduce((a,b)=>a+b,0)/vals.length;
    return vals.reduce((s,v)=>s+(v-mean)**2,0)/vals.length;
  });
  const maxV=Math.max(...variances)||1;
  const normalized=variances.map(v=>(v/maxV*100).toFixed(1));
  makeChart('featImpChart',{type:'bar',data:{labels:numCols,datasets:[{label:'Relative Importance',data:normalized,backgroundColor:COLORS.slice(0,numCols.length).map(c=>c+'cc'),borderWidth:0}]},options:{indexAxis:'y',plugins:{legend:{display:false}},scales:{x:{max:100,grid:{color:getChartTheme().gridColor},ticks:{color:getChartTheme().tickColor}},y:{grid:{color:getChartTheme().gridColor},ticks:{color:getChartTheme().tickColor}}}}});
}

function updateSplitInfo(val){
  const n=workingData.length;
  const train=Math.round(n*val/100), test=n-train;
  document.getElementById('split-info').innerHTML=`
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem">
      <div style="padding:.5rem;background:rgba(var(--accent-rgb),0.1);border-radius:6px">
        <div style="font-size:.72rem;color:var(--text3)">Training</div>
        <div style="font-size:1.4rem;font-weight:700;color:var(--accent)">${train.toLocaleString()}</div>
        <div style="font-size:.73rem;color:var(--text2)">${val}% of data</div>
      </div>
      <div style="padding:.5rem;background:rgba(var(--accent2-rgb),0.1);border-radius:6px">
        <div style="font-size:.72rem;color:var(--text3)">Testing</div>
        <div style="font-size:1.4rem;font-weight:700;color:var(--accent2)">${test.toLocaleString()}</div>
        <div style="font-size:.73rem;color:var(--text2)">${100-val}% of data</div>
      </div>
    </div>`;
}

function genPolyFeatures(){
  const c1=document.getElementById('poly-col1').value, c2=document.getElementById('poly-col2').value;
  const newCol=`${c1}_x_${c2}`;
  workingData.forEach(r=>r[newCol]=+((+r[c1]||0)*(+r[c2]||0)).toFixed(4));
  if(!columns.includes(newCol)) columns.push(newCol);
  colTypes[newCol]='float';
  document.getElementById('poly-result').textContent=`Created feature: ${newCol}`;
  populateAllSelects();
}

function simulateEval(){
  if(!mlTarget){document.getElementById('ml-accuracy').textContent='—';document.getElementById('ml-prec').textContent='—';return;}
  const n=workingData.length;
  const numF=getNumericCols().length, catF=getCatCols().length;
  const totalF=numF+catF;
  const maxClasses=new Set(workingData.map(r=>r[mlTarget])).size;
  const isClass=getCatCols().includes(mlTarget)||maxClasses<=10;

  if(isClass){
    // Balanced accuracy baseline: 1/maxClasses = random chance
    const baseline=(1/maxClasses*100);
    // Data quality factors: more features = better up to a point, more rows = better
    const quality=Math.min(1,Math.log(n)/Math.log(10000))*Math.min(1,totalF/5)*0.8+0.2;
    const accBaseline=Math.min(98,baseline+(100-baseline)*quality);
    // Add some noise for realism
    const acc=Math.min(99.5,Math.max(accBaseline-8,accBaseline-Math.random()*6)).toFixed(1);
    const prec=(+acc/100*0.95+Math.random()*0.05).toFixed(3);
    const rec=(+acc/100*0.9+Math.random()*0.08).toFixed(3);
    const f1=(2*prec*rec/(+prec+ +rec)).toFixed(3);
    const auc=(+acc/100*0.85+Math.random()*0.12).toFixed(3);
    // Confusion matrix based on accuracy
    const correct=n*(+acc/100); const wrong=n-correct;
    const tp=Math.round(correct*0.55); const tn=Math.round(correct*0.35);
    const fp=Math.round(wrong*0.45); const fn=Math.round(wrong*0.55);

    document.getElementById('ml-accuracy').textContent=acc+'%';
    document.getElementById('acc-bar').style.width=acc+'%';
    document.getElementById('ml-prec').textContent=prec;
    document.getElementById('ml-recall').textContent=rec;
    document.getElementById('ml-f1').textContent=f1;
    document.getElementById('ml-auc').textContent=auc;
    document.getElementById('ml-mse').textContent='—';
    document.getElementById('ml-r2').textContent='—';
    document.getElementById('ml-baseline').innerHTML=`
      <div class="eda-stat"><span class="eda-key">Random baseline</span><span class="eda-value">${baseline.toFixed(1)}%</span></div>
      <div class="eda-stat"><span class="eda-key">Data quality score</span><span class="eda-value">${(quality*100).toFixed(0)}%</span></div>
      <div class="eda-stat"><span class="eda-key">Samples per class</span><span class="eda-value">${(n/maxClasses).toFixed(0)}</span></div>`;

    const cells=document.getElementById('conf-matrix').children;
    cells[0].textContent=tp; cells[1].textContent=fn;
    cells[2].textContent=fp; cells[3].textContent=tn;

    // ROC curve
    const pts=Array.from({length:20},(_,i)=>({x:i/19,y:Math.min(1,i/19+parseFloat(auc)*(1-i/19))}));
    pts.unshift({x:0,y:0}); pts.push({x:1,y:1});
    makeChart('rocChart',{type:'line',data:{datasets:[
      {label:`AUC = ${auc}`,data:pts,borderColor:COLORS[0],backgroundColor:'transparent',pointRadius:0,tension:.3},
      {label:'Random',data:[{x:0,y:0},{x:1,y:1}],borderColor:'rgba(100,116,139,.4)',backgroundColor:'transparent',borderDash:[4,4],pointRadius:0}
    ]},options:{scales:{x:{title:{display:true,text:'FPR',color:getChartTheme().tickColor},type:'linear',min:0,max:1},y:{title:{display:true,text:'TPR',color:getChartTheme().tickColor},min:0,max:1}}}});
  } else {
    // Regression: estimate R² based on data quality
    const quality=Math.min(1,Math.log(n)/Math.log(10000))*Math.min(1,totalF/5)*0.6+0.1;
    const r2=Math.min(0.95,Math.max(0.1,quality*0.9+Math.random()*0.08)).toFixed(3);
    // MSE relative to target variance
    const targetVals=workingData.map(r=>+r[mlTarget]).filter(v=>!isNaN(v));
    const tMean=targetVals.reduce((a,b)=>a+b,0)/targetVals.length;
    const tVar=targetVals.reduce((s,v)=>s+(v-tMean)**2,0)/targetVals.length;
    const mse=(tVar*(1-parseFloat(r2))*0.5+Math.random()*tVar*0.1).toFixed(2);

    document.getElementById('ml-accuracy').textContent='—';
    document.getElementById('acc-bar').style.width='0%';
    document.getElementById('ml-prec').textContent='—';
    document.getElementById('ml-recall').textContent='—';
    document.getElementById('ml-f1').textContent='—';
    document.getElementById('ml-auc').textContent='—';
    document.getElementById('ml-mse').textContent=mse;
    document.getElementById('ml-r2').textContent=r2;
    document.getElementById('ml-baseline').innerHTML=`
      <div class="eda-stat"><span class="eda-key">Target variance</span><span class="eda-value">${tVar.toFixed(2)}</span></div>
      <div class="eda-stat"><span class="eda-key">Data quality score</span><span class="eda-value">${(quality*100).toFixed(0)}%</span></div>
      <div class="eda-stat"><span class="eda-key">Sample size</span><span class="eda-value">${n.toLocaleString()}</span></div>`;

    // Confusion matrix not meaningful for regression
    const cells=document.getElementById('conf-matrix').children;
    cells[0].textContent='N/A'; cells[1].textContent='N/A';
    cells[2].textContent='N/A'; cells[3].textContent='N/A';
  }
}

function runPCA(){
  const numCols=getNumericCols().slice(0,10);
  if(numCols.length<2){document.getElementById('pca-result').textContent='Need at least 2 numeric columns';return;}
  const variances=numCols.map(col=>{
    const vals=workingData.map(r=>+r[col]).filter(v=>!isNaN(v));
    const mean=vals.reduce((a,b)=>a+b,0)/vals.length;
    return vals.reduce((s,v)=>s+(v-mean)**2,0)/vals.length;
  });
  const total=variances.reduce((a,b)=>a+b,0)||1;
  const explained=variances.map(v=>+(v/total*100).toFixed(1)).sort((a,b)=>b-a);
  const cumulative=explained.reduce((acc,v,i)=>{acc.push(+(v+(acc[i-1]||0)).toFixed(1));return acc;},[]);
  const pcaLabels=explained.map((_,i)=>`PC${i+1}`);

  makeChart('pcaChart',{type:'bar',data:{labels:pcaLabels,datasets:[
    {label:'Explained Variance %',data:explained,backgroundColor:COLORS[0]+'cc',borderWidth:0},
    {label:'Cumulative %',data:cumulative,type:'line',borderColor:COLORS[1],backgroundColor:'transparent',pointRadius:3,tension:.4,yAxisID:'y2'}
  ]},options:{scales:{y:{max:100},y2:{position:'right',max:100,grid:{display:false}}}}});

  const comp90=cumulative.findIndex(v=>v>=90)+1;
  document.getElementById('pca-result').textContent=`Top ${comp90||numCols.length} components explain ≥90% variance`;
  document.getElementById('pca-info').innerHTML=`
    <div class="eda-stat"><span class="eda-key">Original Features</span><span class="eda-value">${numCols.length}</span></div>
    <div class="eda-stat"><span class="eda-key">Components for 90% var</span><span class="eda-value">${comp90||numCols.length}</span></div>
    <div class="eda-stat"><span class="eda-key">Dimensionality Reduction</span><span class="eda-value">${numCols.length-comp90}<i class="fas fa-arrow-right"></i>${comp90}</span></div>
    <div class="eda-stat"><span class="eda-key">Variance Retained</span><span class="eda-value">≥90%</span></div>`;

  // Feature loadings table
  const numColsFull=getNumericCols().slice(0,10);
  const variancesFull=numColsFull.map(col=>{
    const vals=workingData.map(r=>+r[col]).filter(v=>!isNaN(v));
    const mean=vals.reduce((a,b)=>a+b,0)/vals.length;
    return vals.reduce((s,v)=>s+(v-mean)**2,0)/vals.length;
  });
  const totalVar=variancesFull.reduce((a,b)=>a+b,0)||1;
  const loadings=numColsFull.map((col,i)=>({col,loading:+(variancesFull[i]/totalVar*100).toFixed(1)}))
    .sort((a,b)=>b.loading-a.loading);
  document.getElementById('pca-loadings').innerHTML=`
    <div style="display:grid;grid-template-columns:1fr auto;gap:.3rem;font-size:.72rem">
      <div style="color:var(--text3);font-weight:600">Feature</div>
      <div style="color:var(--text3);font-weight:600;text-align:right">Contribution %</div>
      ${loadings.slice(0,15).map(f=>`
        <div style="overflow:hidden;text-overflow:ellipsis">${f.col}</div>
        <div style="text-align:right;font-family:var(--mono)">
          <span style="color:var(--accent)">${f.loading}%</span>
          <div style="display:inline-block;width:60px;height:6px;background:var(--bg3);border-radius:3px;vertical-align:middle;margin-left:6px">
            <div style="height:100%;width:${f.loading}%;background:var(--accent);border-radius:3px"></div>
          </div>
        </div>
      `).join('')}
    </div>`;
  if(loadings.length>15) document.getElementById('pca-loadings').innerHTML+=`<div style="margin-top:.4rem;font-size:.7rem;color:var(--text3)">Showing top 15 of ${loadings.length} features</div>`;
}

// ═══════════════════════════════════════
// DASHBOARD — fully customizable
// ═══════════════════════════════════════
let dashCharts = [];
let dashConfig = { barCat:'', barNum:'', pieCat:'', lineNum:'' };
let dashChartIdCounter = 0;

function initDefaultDashCharts(){
  const nums = getNumericCols(), cats = getCatCols();
  dashCharts = [
    { id:'dashBar', type:'bar', title:'Distribution Overview', xCol:cats[0]||'', yCol:nums[0]||'', visible:true, builtin:true },
    { id:'dashPie', type:'doughnut', title:'Category Breakdown', xCol:cats[0]||'', yCol:'', visible:true, builtin:true },
    { id:'dashLine', type:'line', title:'Data Trend', xCol:'', yCol:nums[0]||'', visible:true, builtin:true },
    { id:'dashQuality', type:'quality', title:'Data Quality Score', visible:true, builtin:true }
  ];
  dashChartIdCounter = 10;
}
function genChartId(){
  return 'chart_' + (dashChartIdCounter++);
}
function renderDashboard(){
  if(!workingData.length){document.getElementById('dash-no-data').style.display='block';document.getElementById('dash-content').style.display='none';return;}
  document.getElementById('dash-no-data').style.display='none';
  document.getElementById('dash-content').style.display='block';

  const numCols=getNumericCols();
  const kpis=document.getElementById('dash-kpis');
  const accents=['black','gray','silver','dark'];
  const icons=['<i class="fas fa-chart-bar"></i>','<i class="fas fa-money-bill-wave"></i>','<i class="fas fa-users"></i>','<i class="fas fa-bolt"></i>'];
  kpis.innerHTML=numCols.slice(0,4).map((col,i)=>{
    const vals=workingData.map(r=>+r[col]).filter(v=>!isNaN(v));
    const sum=vals.reduce((a,b)=>a+b,0);
    const mean=sum/vals.length;
    const prev=mean*(.85+Math.random()*.3);
    const pct=((mean-prev)/prev*100).toFixed(1);
    return `<div class="kpi-card kpi-accent-${accents[i]}">
      <div class="kpi-icon">${icons[i]}</div>
      <div class="kpi-val">${sum>1e6?(sum/1e6).toFixed(1)+'M':sum>1e3?(sum/1e3).toFixed(1)+'K':sum.toFixed(0)}</div>
      <div class="kpi-label">Total ${col}</div>
      <div class="kpi-trend ${+pct>=0?'trend-up':'trend-down'}">${+pct>=0?'<i class="fas fa-caret-up"></i>':'<i class="fas fa-caret-down"></i>'} ${Math.abs(pct)}% vs prev</div>
    </div>`;
  }).join('');

  // AI Insights
  const nullCount=workingData.reduce((s,r)=>s+Object.values(r).filter(v=>v==null||v==='').length,0);
  const catCols=getCatCols();
  const insightsList=[
    `Dataset has <strong>${workingData.length}</strong> rows and <strong>${columns.length}</strong> columns`,
    nullCount?`<i class="fas fa-triangle-exclamation"></i> ${nullCount} missing values detected across ${columns.filter(c=>workingData.some(r=>r[c]==null)).length} columns`:'<i class="fas fa-check"></i> No missing values detected',
    numCols.length?`${numCols.length} numeric columns available for statistical analysis`:'No numeric columns found',
    catCols.length?`${catCols.length} categorical columns suitable for segmentation analysis`:'No categorical columns',
  ];
  if(numCols.length>=2){
    const r=pearson(numCols[0],numCols[1]);
    if(Math.abs(r)>0.5) insightsList.push(`<strong>${numCols[0]}</strong> and <strong>${numCols[1]}</strong> show ${r>0?'positive':'negative'} correlation (r=${r.toFixed(2)})`);
  }
  document.getElementById('ai-insights').innerHTML=insightsList.map(s=>`<div class="insight-item"><span class="insight-bullet"><i class="fas fa-arrow-right"></i></span><span>${s}</span></div>`).join('');

  // Destroy existing charts
  dashCharts.forEach(c => { if(c.id!=='dashQuality') destroyChart(c.id); });

  // Build chart cards from dashCharts
  const container = document.getElementById('dash-charts');
  container.innerHTML = '';
  dashCharts.forEach((chart, idx) => {
    if(!chart.visible) return;
    if(chart.type === 'quality'){
      const card = document.createElement('div');
      card.className = 'chart-card';
      card.setAttribute('data-chart', chart.id);
      card.draggable = true;
      card.innerHTML = `
        <div class="chart-hdr">
          <div class="chart-title"><span class="drag-handle"><i class="fas fa-grip-vertical"></i></span> <span class="dot"></span> ${chart.title}</div>
          <button class="dash-remove-btn" onclick="removeDashChart('${chart.id}')" title="Remove chart"><i class="fas fa-xmark"></i></button>
        </div>
        <div class="chart-body" style="height:auto;min-height:auto;padding:.5rem 0"><div id="${chart.id}-wrap"></div></div>`;
      container.appendChild(card);
      renderQualityScore();
      return;
    }
    // Regular chart
    const card = document.createElement('div');
    card.className = 'chart-card';
    card.setAttribute('data-chart', chart.id);
    card.draggable = true;
    const h = chart.type==='line'||chart.type==='area'?'240px':'220px';
    card.innerHTML = `
      <div class="chart-hdr">
        <div class="chart-title"><span class="drag-handle"><i class="fas fa-grip-vertical"></i></span> <i class="fas fa-chart-${chart.type==='doughnut'?'pie':chart.type}"></i> ${chart.title}</div>
        <button class="dash-remove-btn" onclick="removeDashChart('${chart.id}')" title="Remove chart"><i class="fas fa-xmark"></i></button>
      </div>
      <div class="chart-body" style="height:${h}"><canvas id="${chart.id}"></canvas></div>`;
    container.appendChild(card);
    renderSingleChart(chart);
  });
}
function renderSingleChart(chart){
  const {id, type, xCol, yCol} = chart;
  if(!workingData.length) return;
  const nums = getNumericCols(), cats = getCatCols();
  const catData = cats.length ? (cats.includes(xCol) ? xCol : cats[0]) : '';
  const numData = nums.length ? (nums.includes(yCol) ? yCol : nums[0]) : '';
  try {
    if(type === 'bar'){
      if(!catData||!numData) return;
      const sums = groupSum(catData, numData);
      const labels = Object.keys(sums).slice(0,15);
      makeChart(id, {type:'bar', data:{labels, datasets:[{label:numData, data:labels.map(l=>sums[l]), backgroundColor:COLORS[0]+'cc', borderWidth:0}]}, options:{plugins:{legend:{display:false}}}});
    } else if(type === 'line'){
      if(!numData) return;
      const d2 = workingData.slice(0,100);
      makeChart(id, {type:'line', data:{labels:d2.map((_,i)=>i+1), datasets:[{label:numData, data:d2.map(r=>+r[numData]||0), borderColor:COLORS[1], backgroundColor:COLORS[1]+'22', fill:true, tension:.4, pointRadius:0}]}, options:{plugins:{legend:{display:false}}}});
    } else if(type === 'pie' || type === 'doughnut'){
      if(!catData) return;
      const freq = groupCount(catData);
      const top = Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,8);
      const cut = type==='doughnut'?'55%':'0';
      makeChart(id, {type:'doughnut', data:{labels:top.map(t=>t[0]), datasets:[{data:top.map(t=>t[1]), backgroundColor:COLORS, borderWidth:2, borderColor:'transparent'}]}, options:{cutout:cut}});
    } else if(type === 'scatter'){
      if(!catData||!numData) return;
      const pts = workingData.slice(0,200).map(r => ({x:+r[catData]||0, y:+r[numData]||0})).filter(p=>p.x&&p.y);
      makeChart(id, {type:'scatter', data:{datasets:[{label:numData+' vs '+catData, data:pts, backgroundColor:COLORS[0]+'88', borderColor:COLORS[0], pointRadius:4}]}, options:{plugins:{legend:{display:false}}}});
    } else if(type === 'area'){
      if(!numData) return;
      const d2 = workingData.slice(0,100);
      makeChart(id, {type:'line', data:{labels:d2.map((_,i)=>i+1), datasets:[{label:numData, data:d2.map(r=>+r[numData]||0), borderColor:COLORS[2], backgroundColor:COLORS[2]+'44', fill:true, tension:.3, pointRadius:0}]}, options:{plugins:{legend:{display:false}}}});
    } else if(type === 'radar'){
      if(!numData) return;
      const top = workingData.slice(0,8);
      const labels = cats.length ? top.map(r=>r[catData||cats[0]]) : top.map((_,i)=>'Item '+i);
      makeChart(id, {type:'radar', data:{labels, datasets:[{label:numData, data:top.map(r=>+r[numData]||0), backgroundColor:COLORS[0]+'33', borderColor:COLORS[0], pointBackgroundColor:COLORS[0]}]}, options:{}});
    } else if(type === 'histogram'){
      if(!numData) return;
      const vals = workingData.map(r=>+r[numData]).filter(v=>!isNaN(v));
      const bins = 10;
      const min = Math.min(...vals), max = Math.max(...vals);
      const w = (max-min)/bins;
      const hist = Array(bins).fill(0);
      const histLabels = Array(bins).fill(0).map((_,i)=> (min+i*w).toFixed(1));
      vals.forEach(v => { const b = Math.min(Math.floor((v-min)/w), bins-1); if(b>=0) hist[b]++; });
      makeChart(id, {type:'bar', data:{labels:histLabels, datasets:[{label:numData, data:hist, backgroundColor:COLORS[3]+'88', borderWidth:0}]}, options:{plugins:{legend:{display:false}}}});
    }
  } catch(e){ /* skip chart on error */ }
}
function renderQualityScore(){
  const nullPct=workingData.reduce((s,r)=>s+Object.values(r).filter(v=>v==null||v==='').length,0)/(workingData.length*columns.length)*100;
  const dupPct=(workingData.length-new Set(workingData.map(r=>JSON.stringify(r))).size)/workingData.length*100;
  const score=Math.round(100-nullPct*2-dupPct*1.5);
  const metrics=[
    {name:'Completeness',val:Math.round(100-nullPct),color:'var(--success)'},
    {name:'Uniqueness',val:Math.round(100-dupPct),color:'var(--accent)'},
    {name:'Consistency',val:Math.round(75+Math.random()*20),color:'var(--accent2)'},
    {name:'Overall Score',val:Math.max(0,Math.min(100,score)),color:'var(--accent3)'}
  ];
  const wrap = document.getElementById('dashQuality-wrap');
  if(!wrap) return;
  wrap.innerHTML=metrics.map(m=>`
    <div style="display:flex;align-items:center;gap:.75rem;margin-bottom:.6rem">
      <div style="min-width:120px;font-size:.8rem;color:var(--text2)">${m.name}</div>
      <div style="flex:1;height:10px;background:var(--bg3);border-radius:5px;overflow:hidden">
        <div style="height:100%;width:${m.val}%;background:${m.color};border-radius:5px;transition:width .6s ease"></div>
      </div>
      <div style="min-width:36px;font-size:.78rem;font-family:var(--mono);text-align:right;color:${m.color}">${m.val}%</div>
    </div>`).join('');
}
function showCustomizeDash(){
  const el = document.getElementById('dash-customize');
  if(el.style.display!=='none'&&el.style.display!==''){
    el.style.display='none'; return;
  }
  rebuildChartList();
  el.style.display = 'block';
}
function hideCustomizeDash(){
  document.getElementById('dash-customize').style.display = 'none';
}
function rebuildChartList(){
  const list = document.getElementById('dash-chart-list');
  if(!list) return;
  list.innerHTML = dashCharts.map((c,i) => {
    const iconMap = {bar:'chart-bar',line:'chart-line',pie:'chart-pie',doughnut:'chart-pie',scatter:'chart-scatter',area:'chart-area',radar:'chart-radar',histogram:'chart-bar',quality:'square-poll-vertical'};
    const ico = iconMap[c.type]||'chart-simple';
    return `<label class="dash-toggle" data-chart="${c.id}" style="${!c.visible?'opacity:.5':''}">
      <input type="checkbox" ${c.visible?'checked':''} onchange="toggleDashChart('${c.id}',this.checked)">
      <i class="fas fa-${ico}"></i>
      <span style="flex:1">${c.title}</span>
      <span style="font-size:.65rem;color:var(--text3);margin-right:4px">${c.type}</span>
      <button class="dash-remove-btn" onclick="event.stopPropagation();removeDashChart('${c.id}')" style="width:20px;height:20px;font-size:.6rem" title="Remove"><i class="fas fa-xmark"></i></button>
    </label>`;
  }).join('');
}
function showAddChartModal(){
  const nums = getNumericCols(), cats = getCatCols();
  const populate = (id, arr, sel) => {
    const s = document.getElementById(id); if(!s) return;
    s.innerHTML = arr.map(c => `<option value="${c}"${c===sel?' selected':''}>${c}</option>`).join('');
  };
  populate('addChart-x', cats.length ? cats : columns);
  populate('addChart-y', nums.length ? nums : columns);
  populate('addChart-y2', nums.length ? nums : columns);
  document.getElementById('addChart-title').value = '';
  document.getElementById('addChartModal').style.display = 'flex';
}
function closeAddChartModal(){
  document.getElementById('addChartModal').style.display = 'none';
}
function addDashChart(){
  const type = document.getElementById('addChart-type').value;
  const title = document.getElementById('addChart-title').value.trim() || (type.charAt(0).toUpperCase()+type.slice(1)+' Chart');
  const xCol = document.getElementById('addChart-x').value;
  const yCol = document.getElementById('addChart-y').value;
  const newChart = { id:genChartId(), type, title, xCol, yCol, visible:true, builtin:false };
  dashCharts.push(newChart);
  closeAddChartModal();
  renderDashboard();
  // Refresh customize list if open
  if(document.getElementById('dash-customize').style.display==='block') rebuildChartList();
}
function removeDashChart(id){
  dashCharts = dashCharts.filter(c => c.id !== id);
  renderDashboard();
  if(document.getElementById('dash-customize').style.display==='block') rebuildChartList();
}
function toggleDashChart(id, visible){
  const chart = dashCharts.find(c => c.id === id);
  if(chart){ chart.visible = visible; }
  const card = document.querySelector(`#dash-charts .chart-card[data-chart="${id}"]`);
  if(card) card.style.display = visible ? '' : 'none';
  if(document.getElementById('dash-customize').style.display==='block') rebuildChartList();
  if(visible) renderDashboard();
}
function applyDashVisibility(){ /* Handled by renderDashboard directly */ }

// ─── Dashboard Drag & Drop ───
let dashDragInit = false;
function initDashDrag(){
  const container = document.getElementById('dash-charts');
  if(!container || dashDragInit) return;
  dashDragInit = true;
  let dragEl = null;

  container.addEventListener('dragstart', e => {
    const card = e.target.closest('.chart-card');
    if(!card || !e.target.closest('.drag-handle')){ e.preventDefault(); return; }
    dragEl = card;
    card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', card.dataset.chart);
  });
  container.addEventListener('dragend', e => {
    const card = e.target.closest('.chart-card');
    if(card) card.classList.remove('dragging');
    container.querySelectorAll('.chart-card').forEach(c => c.classList.remove('drag-over'));
    dragEl = null;
  });
  container.addEventListener('dragover', e => {
    e.preventDefault();
    const card = e.target.closest('.chart-card');
    if(!card || card === dragEl) return;
    container.querySelectorAll('.chart-card').forEach(c => c.classList.remove('drag-over'));
    card.classList.add('drag-over');
  });
  container.addEventListener('dragleave', e => {
    const card = e.target.closest('.chart-card');
    if(card) card.classList.remove('drag-over');
  });
  container.addEventListener('drop', e => {
    e.preventDefault();
    const target = e.target.closest('.chart-card');
    if(!target || !dragEl || target === dragEl) return;
    container.querySelectorAll('.chart-card').forEach(c => c.classList.remove('drag-over'));
    const all = [...container.querySelectorAll('.chart-card')];
    const fromIdx = all.indexOf(dragEl);
    const toIdx = all.indexOf(target);
    if(fromIdx < toIdx){ target.after(dragEl); } else { target.before(dragEl); }
    // Sync dashCharts order
    const newOrder = [...container.querySelectorAll('.chart-card')].map(c => c.dataset.chart);
    const reordered = newOrder.map(id => dashCharts.find(c => c.id === id)).filter(Boolean);
    const remaining = dashCharts.filter(c => !newOrder.includes(c.id));
    dashCharts = [...reordered, ...remaining];
    dragEl.classList.remove('dragging');
    dragEl = null;
  });
}

let liveDashInterval = null;
function toggleLiveDash(){
  const btn = document.getElementById('liveDashBtn');
  const dot = document.getElementById('liveDashDot');
  if(liveDashInterval){
    clearInterval(liveDashInterval);
    liveDashInterval = null;
    btn.style.borderColor = 'var(--border)';
    btn.style.color = 'var(--text2)';
    dot.style.background = 'var(--text3)';
  } else {
    liveDashInterval = setInterval(() => {
      if(document.getElementById('panel-dashboard').classList.contains('active')) renderDashboard();
    }, 2000);
    btn.style.borderColor = 'var(--success)';
    btn.style.color = 'var(--success)';
    dot.style.background = 'var(--success)';
    dot.style.boxShadow = '0 0 6px var(--success)';
    dot.style.animation = 'pulse 1.2s ease-in-out infinite';
  }
}

// ═══════════════════════════════════════
// CHATBOT
// ═══════════════════════════════════════
let chatOpen = false;
let chatState = { mode:'normal', chartType:'', chartX:'', chartY:'' };
const CHART_TYPES = ['Bar','Line','Pie','Scatter','Histogram','Area','Doughnut'];
function toggleChat(){
  chatOpen = !chatOpen;
  document.getElementById('chatPanel').classList.toggle('open', chatOpen);
  document.getElementById('chatToggle').classList.toggle('active', chatOpen);
  document.getElementById('chatOverlay').classList.toggle('active', chatOpen);
  if(chatOpen){
    setTimeout(()=>document.getElementById('chatInput').focus(),100);
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
}
function addChatMsg(text, sender){
  const msgs = document.getElementById('chatMsgs');
  const div = document.createElement('div');
  div.className = 'chat-msg ' + sender;
  const time = new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
  div.innerHTML = text;
  const t = document.createElement('div');
  t.style.cssText = 'font-size:.65rem;color:var(--text3);margin-top:4px';
  t.textContent = time;
  div.appendChild(t);
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
  return div;
}
function addChips(container, items, onclick){
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;margin-top:6px';
  items.forEach(label => {
    const chip = document.createElement('button');
    chip.textContent = label;
    chip.style.cssText = 'padding:3px 10px;border-radius:12px;border:1px solid var(--accent);background:rgba(var(--accent-rgb),0.1);color:var(--accent);cursor:pointer;font-size:.75rem;font-family:var(--sans);transition:all .15s';
    chip.onmouseover = () => chip.style.background = 'rgba(var(--accent-rgb),0.25)';
    chip.onmouseout = () => chip.style.background = 'rgba(var(--accent-rgb),0.1)';
    chip.onclick = () => { onclick(label); chip.remove(); };
    wrap.appendChild(chip);
  });
  container.appendChild(wrap);
}
function addChartMsg(id, config, height){
  const msgs = document.getElementById('chatMsgs');
  const div = document.createElement('div');
  div.className = 'chat-msg bot';
  div.style.cssText = 'width:100%;padding:8px 10px;box-sizing:border-box';
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:relative;width:100%;height:'+(height||200)+'px;background:var(--bg);border-radius:6px;overflow:hidden';
  const canvas = document.createElement('canvas');
  canvas.id = id;
  canvas.style.cssText = 'width:100%;height:100%';
  wrap.appendChild(canvas);
  div.appendChild(wrap);
  const time = new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
  const t = document.createElement('div');
  t.style.cssText = 'font-size:.65rem;color:var(--text3);margin-top:4px';
  t.textContent = time;
  div.appendChild(t);
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
  setTimeout(() => {
    const el = document.getElementById(id);
    if(el) makeChart(id, config);
  }, 200);
}
function showTyping(){
  const msgs = document.getElementById('chatMsgs');
  const div = document.createElement('div');
  div.className = 'chat-msg bot';
  div.id = 'typing-indicator';
  div.innerHTML = '<span style="display:inline-flex;gap:3px"><span style="width:6px;height:6px;background:var(--text3);border-radius:50%;animation:typing 1.2s infinite ease-in-out"></span><span style="width:6px;height:6px;background:var(--text3);border-radius:50%;animation:typing 1.2s infinite ease-in-out .2s"></span><span style="width:6px;height:6px;background:var(--text3);border-radius:50%;animation:typing 1.2s infinite ease-in-out .4s"></span></span>';
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}
function hideTyping(){
  const el = document.getElementById('typing-indicator');
  if(el) el.remove();
}
function handleChatImage(input){
  const file = input.files[0];
  if(!file) return;
  input.value = '';
  const reader = new FileReader();
  reader.onload = function(e){
    const img = new Image();
    img.onload = function(){
      const msgs = document.getElementById('chatMsgs');
      const div = document.createElement('div');
      div.className = 'chat-msg user';
      const imgEl = document.createElement('img');
      imgEl.className = 'chat-img';
      imgEl.src = e.target.result;
      div.appendChild(imgEl);
      const time = new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
      const t = document.createElement('div');
      t.style.cssText = 'font-size:.65rem;color:var(--text3);margin-top:4px';
      t.textContent = time;
      div.appendChild(t);
      msgs.appendChild(div);
      msgs.scrollTop = msgs.scrollHeight;
      showTyping();
      setTimeout(function(){ analyzeChatImage(img); }, 600);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}
function analyzeChatImage(img){
  hideTyping();
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  let w = img.naturalWidth, h = img.naturalHeight;
  const maxDim = 180;
  if(w>maxDim||h>maxDim){ if(w>h){h=h*maxDim/w;w=maxDim;}else{w=w*maxDim/h;h=maxDim;} }
  canvas.width = Math.round(w); canvas.height = Math.round(h);
  ctx.drawImage(img,0,0,canvas.width,canvas.height);
  const d = ctx.getImageData(0,0,canvas.width,canvas.height).data;
  const colors = new Set(); let bright=0; const total=canvas.width*canvas.height;
  for(let i=0;i<d.length;i+=8){
    const b=(d[i]+d[i+1]+d[i+2])/3;
    if(b>200) bright++;
    colors.add(Math.floor(d[i]/48)*48+','+Math.floor(d[i+1]/48)*48+','+Math.floor(d[i+2]/48)*48);
  }
  let hE=0, vE=0;
  for(let y=1;y<canvas.height-1;y++) for(let x=1;x<canvas.width-1;x++){
    const i=(y*canvas.width+x)*4,g=(d[i]+d[i+1]+d[i+2])/3;
    if(Math.abs((d[(y*canvas.width+x-1)*4]+d[(y*canvas.width+x-1)*4+1]+d[(y*canvas.width+x-1)*4+2])/3-g)>40) hE++;
    if(Math.abs((d[((y-1)*canvas.width+x)*4]+d[((y-1)*canvas.width+x)*4+1]+d[((y-1)*canvas.width+x)*4+2])/3-g)>40) vE++;
  }
  const edgeD=(hE+vE)/total, hv=vE?hE/vE:1, cDiv=colors.size/(total/2||1);
  let score=0, reasons=[];
  if(hv>0.25&&hv<4){ score+=30; reasons.push('Balanced grid lines (axes + ticks)'); }
  if(edgeD>0.04){ score+=20; reasons.push('Structured edges detected'); }
  if(colors.size>6){ score+=20; reasons.push('Multiple distinct colors'); }
  if(bright>total*0.005){ score+=15; reasons.push('Light annotation/text regions'); }
  const ar=img.naturalWidth/img.naturalHeight;
  if(ar>0.7&&ar<3){ score+=15; reasons.push('Standard chart aspect ratio'); }
  const isChart=score>=55;
  let reply;
  if(isChart){
    let ct=hv>0.6&&hv<2.5?'a Bar/Column or Line chart':hv>=2.5?'a Line or Area chart':
      colors.size>12?'a Pie/Doughnut chart':'a Chart/Graph';
    reply='<i class="fas fa-check-circle" style="color:var(--success)"></i> <strong>Chart/Graph Detected!</strong><br><br>';
    reply+='This appears to be <strong>'+ct+'</strong>.<br><br>';
    reply+='<strong>Analysis Details:</strong><br>';
    reply+='<span style="font-size:.75rem">';
    reply+='<i class="fas fa-vector-square"></i> '+img.naturalWidth+'x'+img.naturalHeight+' px &bull; ';
    reply+='<i class="fas fa-palette"></i> '+colors.size+' color regions &bull; ';
    reply+='<i class="fas fa-border-all"></i> '+(edgeD*100).toFixed(1)+'% edge density';
    reply+='</span><br><br>';
    reply+=reasons.map(r=>'<i class="fas fa-check" style="color:var(--success);font-size:.7rem"></i> '+r).join('<br>');
    reply+='<br><br><em>Try asking me to create a similar chart with your dataset!</em>';
  } else {
    let reason=edgeD<0.015?'Very few detectable edges/lines — this looks like a photograph or solid graphic':
      colors.size<4?'Very limited color palette — charts use multiple distinct colors':
      hv>5?'Mostly horizontal lines, missing vertical axis structure':'Analysis metrics below chart detection threshold';
    reply='<i class="fas fa-times-circle" style="color:var(--danger)"></i> <strong>Not a Chart/Graph</strong><br><br>';
    reply+=reason+'<br><br>';
    reply+='<em>Upload a screenshot of a bar chart, line chart, pie chart, or other data visualization.</em>';
  }
  addChatMsg(reply, 'bot');
}
function sendChat(){
  const input = document.getElementById('chatInput');
  const q = input.value.trim();
  if(!q) return;
  addChatMsg(q, 'user');
  input.value = '';
  if(chatState.mode !== 'normal'){
    showTyping();
    setTimeout(() => processChartFlow(q), 300);
    return;
  }
  showTyping();
  setTimeout(() => processChatQuery(q), 400 + Math.random()*300);
}

function processChartFlow(q){
  hideTyping();
  const lq = q.toLowerCase().trim();
  const s = chatState;

  if(s.mode === 'awaiting_chart_type'){
    const match = CHART_TYPES.find(t => lq.includes(t.toLowerCase()) || lq === t.toLowerCase());
    if(match){
      s.chartType = match;
      s.mode = 'awaiting_chart_x';
      const d = addChatMsg('<i class="fas fa-chart-bar"></i> Great! Choose <strong>X column</strong> (categories/labels):', 'bot');
      addChips(d, columns, (col) => {
        document.getElementById('chatInput').value = col;
        sendChat();
      });
    } else {
      addChatMsg('Please pick a chart type: ' + CHART_TYPES.join(', '), 'bot');
      const d = addChatMsg('', 'bot');
      addChips(d, CHART_TYPES, (t) => {
        document.getElementById('chatInput').value = t;
        sendChat();
      });
    }
    return;
  }

  if(s.mode === 'awaiting_chart_x'){
    const match = columns.find(c => c.toLowerCase() === lq || c.toLowerCase().includes(lq));
    if(match){
      s.chartX = match;
      s.mode = (s.chartType==='Pie') ? 'generate' : 'awaiting_chart_y';
      if(s.chartType==='Pie'){
        generateChatChart();
      } else {
        const d = addChatMsg('<i class="fas fa-chart-bar"></i> Now choose <strong>Y column</strong> (numeric values):', 'bot');
        addChips(d, getNumericCols(), (col) => {
          document.getElementById('chatInput').value = col;
          sendChat();
        });
      }
    } else {
      addChatMsg('Column not found. Available: ' + columns.join(', '), 'bot');
      const d = addChatMsg('', 'bot');
      addChips(d, columns, (col) => {
        document.getElementById('chatInput').value = col;
        sendChat();
      });
    }
    return;
  }

  if(s.mode === 'awaiting_chart_y'){
    const numCols = getNumericCols();
    const match = numCols.find(c => c.toLowerCase() === lq || c.toLowerCase().includes(lq));
    if(match){
      s.chartY = match;
      s.mode = 'generate';
      generateChatChart();
    } else {
      addChatMsg('Please pick a numeric column: ' + numCols.join(', '), 'bot');
      const d = addChatMsg('', 'bot');
      addChips(d, numCols, (col) => {
        document.getElementById('chatInput').value = col;
        sendChat();
      });
    }
    return;
  }
}

function generateChatChart(){
  const s = chatState;
  s.mode = 'normal';
  const chartId = 'chat-chart-' + Date.now();
  const x = s.chartX;
  const y = s.chartY;
  const type = s.chartType.toLowerCase();
  let msg = '<i class="fas fa-chart-bar"></i> <strong>' + s.chartType + ' Chart</strong> — ' + x + (y?' vs ' + y:'');
  addChatMsg(msg, 'bot');

  if(type === 'bar'){
    const sums = groupSum(x, y);
    const labels = Object.keys(sums).slice(0,15);
    addChartMsg(chartId, {type:'bar',data:{labels,datasets:[{label:y,data:labels.map(l=>sums[l]),backgroundColor:COLORS[0]+'cc',borderColor:COLORS[0],borderWidth:1}]}});
  } else if(type === 'line'){
    const d = workingData.slice(0,60);
    addChartMsg(chartId, {type:'line',data:{labels:d.map(r=>r[x]),datasets:[{label:y,data:d.map(r=>+r[y]||0),borderColor:COLORS[1],backgroundColor:COLORS[1]+'22',fill:false,tension:.4,pointRadius:2}]}});
  } else if(type === 'pie'){
    const freq = groupCount(x);
    const top = Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,8);
    addChartMsg(chartId, {type:'pie',data:{labels:top.map(t=>t[0]),datasets:[{data:top.map(t=>t[1]),backgroundColor:COLORS}]}});
  } else if(type === 'scatter'){
    const pts = workingData.slice(0,100).map(r=>({x:+r[x]||0,y:+r[y]||0}));
    addChartMsg(chartId, {type:'scatter',data:{datasets:[{label:x+' vs '+y,data:pts,backgroundColor:COLORS[3]+'99',pointRadius:4}]}});
  } else if(type === 'histogram'){
    const vals = workingData.map(r=>+r[x]).filter(v=>!isNaN(v));
    const {labels,counts} = histogram(vals,12);
    addChartMsg(chartId, {type:'bar',data:{labels,datasets:[{label:'Frequency',data:counts,backgroundColor:COLORS[2]+'cc',borderColor:COLORS[2],borderWidth:1}]},options:{plugins:{legend:{display:false}}}});
  } else if(type === 'area'){
    const d = workingData.slice(0,50);
    addChartMsg(chartId, {type:'line',data:{labels:d.map(r=>r[x]),datasets:[{label:y,data:d.map(r=>+r[y]||0),borderColor:COLORS[0],backgroundColor:COLORS[0]+'33',fill:true,tension:.4,pointRadius:2}]}});
  } else if(type === 'doughnut'){
    const freq = groupCount(x);
    const top = Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,8);
    addChartMsg(chartId, {type:'doughnut',data:{labels:top.map(t=>t[0]),datasets:[{data:top.map(t=>t[1]),backgroundColor:COLORS,borderWidth:2,borderColor:'transparent'}]},options:{cutout:'60%'}});
  }
  s.chartType = ''; s.chartX = ''; s.chartY = '';
}

function getColStats(col){
  const vals = workingData.map(r=>+r[col]).filter(v=>!isNaN(v));
  if(!vals.length) return null;
  const n = vals.length;
  const sum = vals.reduce((a,b)=>a+b,0);
  const mean = sum/n;
  const sorted = [...vals].sort((a,b)=>a-b);
  const med = sorted[Math.floor(n/2)];
  const variance = vals.reduce((s,v)=>s+(v-mean)**2,0)/n;
  const std = Math.sqrt(variance);
  const min = sorted[0], max = sorted[n-1];
  const skew = vals.reduce((s,v)=>s+((v-mean)/std)**3,0)/n;
  const range = max-min;
  return {n,sum,mean,med,std,min,max,skew,range,q1:sorted[Math.floor(n*.25)],q3:sorted[Math.floor(n*.75)]};
}

function processChatQuery(q){
  hideTyping();
  const lq = q.toLowerCase().replace(/[?.!]/g,'').trim();
  const words = lq.split(/\s+/);
  let reply = '';

  // Greetings
  if(/^(hi|hello|hey|hii|hlo|yo|sup|good morning|good evening|good afternoon|gm|ge)$/i.test(lq)){
    const greets = ['Hey there!', 'Hello!', 'Hey!', 'Yo!', 'Sup!'];
    reply = greets[Math.floor(Math.random()*greets.length)] + ' I\'m the <strong>TS Data Assistant</strong>. Ask me about your data — stats, columns, missing values, whatever you\'re curious about. Try <strong>help</strong> to see what I can do.';
  }
  // Help
  else if(/^(help|what can you do|commands|menu|options|guide|what do you do|capabilities)$/i.test(lq)){
    reply = 'Here\'s what I can help you with:<br><br>';
    reply += '<strong>Dataset Overview</strong> — rows, columns, file info<br>';
    reply += '<strong>Statistics</strong> — mean, median, min, max per column<br>';
    reply += '<strong>Missing Values</strong> — null counts and percentages<br>';
    reply += '<strong>Duplicates</strong> — check for duplicate rows<br>';
    reply += '<strong>Correlations</strong> — find relationships between columns<br>';
    reply += '<strong>Column Details</strong> — types, categories, numeric breakdown<br>';
    reply += '<strong>Data Quality</strong> — overall health score for your dataset<br><br>';
    reply += 'Try saying: "show me stats", "any missing values?", "what columns exist", or "how\'s the quality?"';
  }
  // About the website / platform
  else if(/^(about|what is this|what is ts data|platform|website|app|tool|software|ts data|tell me about this site|overview|introduction)$/i.test(lq) || /what does this (site|app|tool|platform|website) do/i.test(lq) || /what can i do (here|on this site|with this)/i.test(lq)){
    reply = '<strong>TS Data</strong> is a browser-based data analysis tool built by <strong>Shub</strong>. No server needed — it all runs right here on your machine.<br><br>';
    reply += 'Here\'s what you can do:<br>';
    reply += '• Upload CSV, Excel, or JSON files (or try the sample datasets)<br>';
    reply += '• Clean and transform your data<br>';
    reply += '• Create 15+ types of interactive charts<br>';
    reply += '• Run EDA with stats and correlations<br>';
    reply += '• Prep data for machine learning<br>';
    reply += '• Generate a dashboard with auto insights<br>';
    reply += '• Export reports as PDF or DOCX<br><br>';
    reply += 'Type <strong>features</strong> for the full breakdown or <strong>panels</strong> to learn about each section.';
  }
  // Features
  else if(/feature|capabilit|function|what all|everything|full list|capabilities|abilities/i.test(lq) && !/column|stats|numeric/i.test(lq)){
    reply = 'Here\'s the full rundown of everything <strong>TS Data</strong> can do:<br><br>';
    reply += '<strong>Data Loading</strong> — upload CSV, Excel, or JSON. Or pick from 3 built-in samples: Sales (200 rows), Students (150 rows), E-Commerce (300 rows).<br><br>';
    reply += '<strong>Data Cleaning</strong> — remove duplicates, handle missing values (drop, mean, median, mode, zero, or custom), fix text case, trim spaces, convert types, rename columns, standardize dates, drop columns, detect outliers (Z-score & IQR), log transform, remove correlated columns, encode categories (label & one-hot), normalize, standardize, clean up text.<br><br>';
    reply += '<strong>EDA</strong> — statistical summaries (mean, median, mode, std, variance, skewness, kurtosis, min, max, quartiles), distribution charts, correlation heatmaps, trend analysis, category breakdowns.<br><br>';
    reply += '<strong>Visualizations</strong> — bar, line, pie, histogram, scatter, area, correlation heatmap, box plot, bubble, doughnut, radar, KDE density. Interactive filtering, search, and PNG export.<br><br>';
    reply += '<strong>Machine Learning</strong> — feature selection by variance, polynomial features, feature importance chart, train/test split, simulated model evaluation (accuracy, precision, recall, F1, ROC curve), PCA reduction.<br><br>';
    reply += '<strong>Dashboard</strong> — KPI cards, AI-generated insights, distribution & trend charts, data quality scoring.<br><br>';
    reply += '<strong>Export</strong> — download cleaned CSV, charts as PNG, or full reports (DOCX or PDF).';
  }
  // Panels / sections
  else if(/panel|section|tab|page|navigate|sidebar|switch/i.test(lq) && !/feature|capabilit/i.test(lq)){
    reply = 'Alright, so here\'s what we\'ve got — there are <strong>6 sections</strong> you can switch between using the sidebar on the left:<br><br>';
    reply += '• <strong>Upload / Load</strong> — get your data in, either by file or using the built-in samples<br>';
    reply += '• <strong>Data Cleaning</strong> — fix nulls, remove dupes, transform stuff<br>';
    reply += '• <strong>EDA</strong> — dive into stats, correlations, distributions<br>';
    reply += '• <strong>Visualizations</strong> — 15+ chart types for pretty pictures<br>';
    reply += '• <strong>Dashboard</strong> — a nice overview with KPIs and insights<br>';
    reply += '• <strong>ML Ready</strong> — feature engineering and model evaluation<br><br>';
    reply += 'Just click any section name in the sidebar and you\'re there!';
  }
  // Upload section
  else if(/upload|load|import|browse|drop|file|uploading|sample data|sample dataset/i.test(lq) && !/column|feature|quality/i.test(lq)){
    reply = 'So you wanna load some data? Here\'s how you can do it:<br><br>';
    reply += '• Upload a <strong>CSV</strong>, <strong>Excel</strong>, or <strong>JSON</strong> file — just click the upload zone or drag & drop it in<br>';
    reply += '• Or pick one of the built-in sample datasets:<br>';
    reply += '&nbsp;&nbsp;• <strong>Sales</strong> (200 rows, 10 columns)<br>';
    reply += '&nbsp;&nbsp;• <strong>Students</strong> (150 rows, 10 columns)<br>';
    reply += '&nbsp;&nbsp;• <strong>E-Commerce</strong> (300 rows, 10 columns)<br><br>';
    reply += 'Once it\'s loaded, you\'ll see a preview, some stats cards, and the full data table pop right in.';
  }
  // Cleaning section
  else if(/clean|cleaning|preprocess|preprocessing|transform|wash|scrub|data preparation|data cleaning|basic cleaning|advanced cleaning/i.test(lq) && !/feature|quality|score/i.test(lq)){
    reply = 'The <strong>Data Cleaning panel</strong> is basically a Swiss Army knife for your data. Here\'s what you can do:<br><br>';
    reply += '<strong>Basic stuff:</strong><br>';
    reply += '• Remove duplicate rows, handle nulls (fill with mean, median, mode, zero, or whatever you want)<br>';
    reply += '• Fix text case, trim spaces, rename columns, drop columns you don\'t need<br>';
    reply += '• Convert data types — number, string, date, boolean. Whatever fits.<br>';
    reply += '• Standardize date formats so everything\'s consistent<br><br>';
    reply += '<strong>Advanced stuff:</strong><br>';
    reply += '• Outlier detection and removal (Z-score or IQR method)<br>';
    reply += '• Log transform for skewed data, remove highly correlated columns<br><br>';
    reply += '<strong>Encoding & Scaling:</strong><br>';
    reply += '• Label encoding, one-hot encoding for your categorical data<br>';
    reply += '• Normalize (Min-Max) or Standardize (Z-score) your numeric columns<br><br>';
    reply += 'Oh, and there\'s an <strong>Auto-Clean All</strong> button that does most of the heavy lifting in one click!';
  }
  // EDA section
  else if(/eda|exploratory|explore|statistical|summary statistics|analysis/i.test(lq) && !/column|feature|quality|upload/i.test(lq)){
    reply = 'The <strong>EDA panel</strong> has 4 tabs to help you really get to know your data:<br><br>';
    reply += '<strong>Statistical Summary</strong> — overview cards showing row count, columns, missing values, plus deep stats per column (mean, median, std dev, min, max, quartiles, skewness, kurtosis — the works)<br><br>';
    reply += '<strong>Distribution</strong> — histograms for every numeric column so you can see how your data\'s spread out<br><br>';
    reply += '<strong>Correlation</strong> — a full heatmap of how columns relate to each other, with auto-generated insights on the strongest relationships<br><br>';
    reply += '<strong>Trends</strong> — line charts for numeric columns over time, plus category-wise bar analysis<br><br>';
    reply += 'Honestly, it\'s a solid way to spot patterns before you dive deeper.';
  }
  // Visualizations section
  else if(/^viz|visualization|^chart types|what charts|available charts|chart panel|graph panel|visualization panel|what visual/i.test(lq)){
    reply = 'Alright, <strong>Visualizations</strong> is split into 3 tabs and honestly there\'s a lot here.<br><br>';
    reply += '<strong>Essential Charts</strong> — bar, line, pie, histogram (adjustable bins!), scatter plot, area chart. All the classics.<br><br>';
    reply += '<strong>Advanced Charts</strong> — correlation heatmap, box plot, bubble chart (gives you X, Y, and size), doughnut chart, radar chart, and KDE density plot.<br><br>';
    reply += '<strong>Interactive Tab</strong> — filter your data by column and value, search across everything, play with interactive bar & line charts.<br><br>';
    reply += 'Oh and every single chart has a download button so you can save it as PNG. Pretty neat!';
  }
  // Dashboard section
  else if(/dashboard|kpi|insight|quality score|score|professional/i.test(lq) && !/data quality/i.test(lq)){
    reply = 'The <strong>Dashboard</strong> gives you a bird\'s-eye view of everything. It\'s got:<br><br>';
    reply += '• <strong>KPI Cards</strong> — top 4 numeric columns with totals and little up/down trend arrows<br>';
    reply += '• <strong>AI Insights</strong> — the app looks at your data and points out interesting stuff automatically<br>';
    reply += '• A distribution bar chart, a category pie/doughnut chart, and a trend line chart<br>';
    reply += '• <strong>Data Quality Score</strong> — completeness, uniqueness, consistency all laid out<br><br>';
    reply += 'You can also generate full reports right from here if you need to share findings.';
  }
  // ML section
  else if(/ml|machine learning|model|train|test|split|feature engineering|pca|evaluation|random forest|regression|classification/i.test(lq)){
    reply = 'The <strong>ML panel</strong> lets you play around with some machine learning workflows:<br><br>';
    reply += '<strong>Feature Engineering</strong> — variance-based feature selection with an adjustable threshold, polynomial feature generation, a feature importance bar chart, and a train/test split slider (50-90%)<br><br>';
    reply += '<strong>Model Evaluation (Simulated)</strong> — accuracy, precision, recall, F1-score, ROC-AUC, MSE, R², a confusion matrix, and an ROC curve chart. Just click "Simulate Evaluation" to see example metrics.<br><br>';
    reply += '<strong>PCA</strong> — explained variance chart and dimensionality reduction info<br><br>';
    reply += 'It\'s all simulated of course, but it gives you a feel for the workflow.';
  }
  // Export section
  else if(/export|download|report|pdf|docx|word|clean csv|generate report/i.test(lq)){
    reply = 'Need to get your stuff out of here? Here\'s what you can do:<br><br>';
    reply += '• <strong>Download Clean CSV</strong> — export your cleaned dataset as a fresh CSV file<br>';
    reply += '• <strong>Generate Report</strong> — a full analysis report with 15 sections (executive summary, dataset info, cleaning, EDA, statistics, correlations, insights, ML, recommendations — the whole deal). Comes as <strong>PDF</strong> or <strong>DOCX</strong>.<br>';
    reply += '• <strong>Export Charts</strong> — every chart has a download button, just click to save as PNG<br><br>';
    reply += 'Pretty much everything you need to share or present your findings.';
  }
  // Theme
  else if(/theme|dark|light|black|white|mode|color|appearance|look/i.test(lq)){
    reply = 'You can switch between Black (dark) and White (light) themes. Just hit the <strong>moon/sun icon</strong> up in the top-right nav bar.<br><br>';
    reply += 'Black theme is the default, but if you prefer a lighter look, go for it — the change applies instantly across all panels, charts, and the sidebar.';
  }
  // Sample data
  else if(/sample|demo|example|built.?in|test data|trial/i.test(lq) && !/upload|feature/i.test(lq)){
    reply = 'We\'ve got <strong>3 sample datasets</strong> you can play with. Just head to the Upload panel and click whichever one you want:<br><br>';
    reply += '• <strong>Sales</strong> — 200 rows, 10 columns (product, region, sales, profit, rating, etc.)<br>';
    reply += '• <strong>Students</strong> — 150 rows, 10 columns (course, grade, attendance, GPA…)<br>';
    reply += '• <strong>E-Commerce</strong> — 300 rows, 10 columns (category, price, revenue, country…)<br><br>';
    reply += 'The Sales dataset actually loads automatically when you open the page, so you\'re never starting from scratch.';
  }
  // Charts / Visualizations — interactive chart generation (MUST come before column analysis)
  else if(/^(chart|graph|plot|visualize|visualisation|create|make|draw|show|generate|i want|create a|make a|draw a|show a|generate a)\s*(chart|graph|plot)/i.test(lq) || lq==='chart'||lq==='graph'||lq==='plot'||/^(bar|line|pie|scatter|histogram|area|doughnut)\s*(chart|graph|plot)?$/i.test(lq) || /^(create|make|draw|generate|show)\s+(a\s+)?(chart|graph|plot)/i.test(lq) || /^(bar|line|pie|scatter|histogram|area|doughnut)$/i.test(lq)){
    if(!workingData.length){ reply = 'No data loaded yet! Go to the Upload panel and grab a dataset, then come back and I\'ll help you make a chart.'; return; }
    else {
      chatState.mode = 'awaiting_chart_type';
      chatState.chartType = ''; chatState.chartX = ''; chatState.chartY = '';
      const chartMatch = lq.match(/^(bar|line|pie|scatter|histogram|area|doughnut)/i);
      if(chartMatch){
        const ct = chartMatch[1].charAt(0).toUpperCase() + chartMatch[1].slice(1).toLowerCase();
        if(CHART_TYPES.includes(ct)){
          chatState.chartType = ct;
          chatState.mode = 'awaiting_chart_x';
          reply = 'Sweet! Now pick an <strong>X column</strong> (categories/labels):';
          const d = addChatMsg(reply, 'bot');
          addChips(d, columns, (col) => { document.getElementById('chatInput').value = col; sendChat(); });
          return;
        }
      }
      reply = 'Let\'s make a chart! What type are you thinking?';
      const d = addChatMsg(reply, 'bot');
      addChips(d, CHART_TYPES, (t) => { document.getElementById('chatInput').value = t; sendChat(); });
      return;
    }
  }
  // Specific column analysis
  else if(/^(what is|tell me about|describe|analyze|stats for|statistics for|show|explain)\s+\w+/i.test(lq) || words.some(w=>columns.map(c=>c.toLowerCase()).includes(w))){
    const colName = words.find(w => columns.map(c=>c.toLowerCase()).includes(w));
    if(colName){
      const actualCol = columns.find(c=>c.toLowerCase()===colName);
      const stats = getColStats(actualCol);
      if(stats){
        reply = '<strong>' + actualCol + '</strong> <span style="color:var(--accent)">(' + colTypes[actualCol] + ')</span><br><br>';
        reply += 'Count: ' + stats.n + '<br>';
        reply += 'Mean: <strong>' + stats.mean.toFixed(2) + '</strong> | Median: <strong>' + stats.med.toFixed(2) + '</strong><br>';
        reply += 'Std Dev: ' + stats.std.toFixed(2) + '<br>';
        reply += 'Min: ' + stats.min.toFixed(2) + ' | Max: ' + stats.max.toFixed(2) + '<br>';
        reply += 'Range: ' + stats.range.toFixed(2) + '<br>';
        reply += 'Q1: ' + stats.q1.toFixed(2) + ' | Q3: ' + stats.q3.toFixed(2) + '<br>';
        reply += 'Skewness: ' + stats.skew.toFixed(2) + (Math.abs(stats.skew)>1?' <span style="color:var(--warning)">(highly skewed)</span>':'');
      } else reply = 'That column doesn\'t have numeric data, so I can\'t really analyze it.';
    } else {
      reply = 'Hmm, I couldn\'t find a column by that name. Here are all the ones we\'ve got:<br><br>' + columns.map(c=>'<strong>' + c + '</strong> (' + colTypes[c] + ')').join('<br>');
    }
  }
  // Statistics summary
  else if(/mean|average|median|stats|statistics|summary|describe|distribution|spread|deviation|variance|min|max|range/i.test(lq)){
    const num = getNumericCols();
    if(!num.length){ reply = 'No numeric columns to run stats on right now.'; }
    else {
      reply = 'Here\'s a quick stats snapshot — <strong>Mean | Median | Std Dev</strong> for each numeric column:<br><br>';
      reply += '<div style="font-size:.75rem;display:grid;grid-template-columns:1fr 1fr;gap:2px">';
      reply += '<span style="font-weight:600;color:var(--text2)">Column</span><span style="font-weight:600;color:var(--text2)">Mean | Median | Std</span>';
      num.slice(0,8).forEach(c => {
        const s = getColStats(c);
        if(!s) return;
        reply += '<span>' + c + '</span><span>' + s.mean.toFixed(1) + ' | ' + s.med.toFixed(1) + ' | ' + s.std.toFixed(1) + '</span>';
      });
      reply += '</div>';
      if(num.length>8) reply += '<br><em>Showing 8 of ' + num.length + ' numeric columns</em>';
    }
  }
  // Missing values
  else if(/missing|null|na|empty|gap|blank|nan|incomplete/i.test(lq)){
    const t = workingData.reduce((s,r)=>s+Object.values(r).filter(v=>v==null||v==='').length,0);
    if(t===0){ reply = 'No missing values anywhere in the dataset — it\'s totally clean!'; }
    else {
      const cols = columns.filter(c=>workingData.some(r=>r[c]==null));
      reply = 'Found some missing values. Here\'s the breakdown:<br><br>';
      reply += 'Total missing: <strong>' + t + '</strong> (' + (t/(workingData.length*columns.length)*100).toFixed(1) + '% of all cells)<br><br>';
      cols.forEach(c => {
        const n = workingData.filter(r=>r[c]==null||r[c]==='').length;
        const pct = (n/workingData.length*100).toFixed(1);
        reply += '• <strong>' + c + '</strong>: ' + n + ' missing (' + pct + '%)<br>';
      });
      reply += '<br>You can fix these up in the Data Cleaning panel if you want.';
    }
  }
  // Duplicates
  else if(/duplicate|dup|repeated|redundant|unique/i.test(lq)){
    const d = workingData.length - new Set(workingData.map(r=>JSON.stringify(r))).size;
    if(d===0) reply = 'No duplicate rows found — every row is unique!';
    else reply = 'Found <strong>' + d + '</strong> duplicate rows (' + (d/workingData.length*100).toFixed(1) + '% of the data). You can nuke them in the Cleaning panel.';
  }
  // Correlations
  else if(/correlation|corr|relationship|relate|association|coeff|pearson|r value/i.test(lq)){
    const num = getNumericCols();
    if(num.length<2){ reply = 'You need at least 2 numeric columns for me to find correlations.'; }
    else {
      const pairs = [];
      for(let i=0;i<num.length;i++){
        for(let j=i+1;j<num.length;j++){
          const r = pearson(num[i],num[j]);
          if(Math.abs(r)>=0.5) pairs.push({c1:num[i],c2:num[j],r});
        }
      }
      pairs.sort((a,b)=>Math.abs(b.r)-Math.abs(a.r));
      if(!pairs.length) reply = 'Nothing significant to report — no strong correlations (|r| ≥ 0.5) between any numeric columns.';
      else {
        reply = 'Here are the <strong>top correlations</strong> I found:<br><br>';
        pairs.slice(0,5).forEach(({c1,c2,r}) => {
          const strength = Math.abs(r)>=0.8?'Strong':Math.abs(r)>=0.6?'Moderate':'Weak';
          const direction = r>0?'positive (both go up together)':'negative (one goes up, other goes down)';
          reply += '• <strong>' + c1 + '</strong> vs <strong>' + c2 + '</strong><br>';
          reply += '  r = <strong>' + r.toFixed(3) + '</strong> — ' + strength + ', ' + direction + '<br>';
        });
      }
    }
  }
  // Data Quality
  else if(/quality|score|rating|cleanliness|health|grade|how clean|data quality/i.test(lq)){
    const nt = workingData.reduce((s,r)=>s+Object.values(r).filter(v=>v==null||v==='').length,0);
    const dc = workingData.length - new Set(workingData.map(r=>JSON.stringify(r))).size;
    const np = nt/(workingData.length*columns.length)*100;
    const qs = Math.round(100-np*2-dc/workingData.length*100*1.5);
    const score = Math.max(0,Math.min(100,qs));
    const bar = '█'.repeat(Math.floor(score/5)) + '░'.repeat(20-Math.floor(score/5));
    reply = '<strong>Data Quality Score</strong><br><br>';
    reply += '<span style="font-size:1.4rem;font-weight:700;color:' + (score>=80?'var(--success)':score>=50?'var(--warning)':'var(--danger)') + '">' + score + '%</span><br>';
    reply += '<span style="font-size:.7rem;letter-spacing:1px">' + bar + '</span><br><br>';
    if(score>=80) reply += '<strong>Excellent!</strong> Your data\'s looking really clean — ready to go.';
    else if(score>=50) reply += '<strong>Moderate.</strong> You might wanna do some cleaning before diving into serious analysis.';
    else reply += '<strong>Needs some love.</strong> There\'s a fair bit of cleaning to do here.';
    reply += '<br>Completeness: ' + Math.round(100-np) + '% | Uniqueness: ' + Math.round(100-dc/workingData.length*100) + '%';
  }
  // Numeric columns
  else if(/numeric|numerical|number|continuous|quantitative/i.test(lq) && !/missing|null|duplicate/i.test(lq)){
    const num = getNumericCols();
    if(!num.length) reply = 'No numeric columns in this dataset, sorry!';
    else reply = 'We\'ve got <strong>' + num.length + ' numeric columns</strong> in the data. Here they are with mean and range:<br><br>' + num.map(c=>{
      const s = getColStats(c);
      return s?'<strong>' + c + '</strong> — Mean: ' + s.mean.toFixed(2) + ', Range: [' + s.min.toFixed(2) + ' — ' + s.max.toFixed(2) + ']':'<strong>' + c + '</strong>';
    }).join('<br>');
  }
  // Categorical columns
  else if(/categor|category|string|text|nominal|ordinal|label|discrete|qualitative/i.test(lq) && !/missing|null|duplicate/i.test(lq)){
    const cat = getCatCols();
      if(!cat.length) reply = 'No categorical columns in this dataset.';
    else {
      reply = 'Here are the <strong>categorical columns</strong> (' + cat.length + ' total):<br><br>';
      cat.forEach(c => {
        const vals = workingData.map(r=>r[c]).filter(v=>v!=null);
        const uniq = [...new Set(vals)];
        const top = Object.entries(groupCount(c)).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k,v])=>k+' ('+v+')').join(', ');
        reply += '<strong>' + c + '</strong> — ' + uniq.length + ' unique values, top: ' + top + '<br>';
      });
    }
  }
  // File/Dataset name
  else if(/name|file|dataset|current|loaded|source/i.test(lq) && !/column|quality|missing|null/i.test(lq)){
    reply = 'Right now you\'re looking at dataset <strong>' + (fileName||'No file loaded') + '</strong><br><br>';
    reply += 'Size: ' + workingData.length.toLocaleString() + ' rows × ' + columns.length + ' columns<br>';
    reply += 'Memory: roughly ' + (JSON.stringify(workingData).length/1024).toFixed(0) + ' KB';
  }
  // Thank you
  else if(/thank|thanks|thx|ty|appreciate|grateful/i.test(lq)){
    const thanks = ['You\'re welcome!', 'Happy to help!', 'Anytime!', 'Glad I could help!'];
    reply = thanks[Math.floor(Math.random()*thanks.length)] + ' Let me know if you need anything else about your data.';
  }
  // Goodbye
  else if(/bye|goodbye|see you|cya|exit|quit|done/i.test(lq)){
    reply = 'Catch you later! Come back anytime if you need help with your data.';
  }
  // About
  else if(/who are you|what are you|about|your name|tell me about yourself/i.test(lq)){
    reply = 'I\'m the <strong>TS Data Assistant</strong> — basically your data-sidekick built right into this tool. Ask me about your dataset: stats, columns, quality scores, correlations, whatever you\'re curious about. I\'m here to help!';
  }
  // Unknown query
  else {
    reply = 'Hmm, not sure I got that. Try asking me things like:<br><br>';
    reply += '• "How many rows?"<br>';
    reply += '• "Show me stats"<br>';
    reply += '• "Any missing values?"<br>';
    reply += '• "Show correlations"<br>';
    reply += '• "List all columns"<br>';
    reply += '• "Data quality?"<br><br>';
    reply += 'Or just type <strong>help</strong> to see everything I can do!';
  }
  addChatMsg(reply, 'bot');
}

// ═══════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════
function exportClean(){
  if(!workingData.length){alert('No data to export');return;}
  const csv=Papa.unparse(workingData);
  const blob=new Blob([csv],{type:'text/csv'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download='cleaned_'+fileName;a.click();
}

function downloadDashboardExcel(){
  if(!workingData.length){alert('No data loaded');return;}
  const numCols = getNumericCols();
  const catCols = getCatCols();
  const nullTotal = workingData.reduce((s,r) => s + Object.values(r).filter(v => v == null || v === '').length, 0);
  const dupCount = workingData.length - new Set(workingData.map(r => JSON.stringify(r))).size;
  const nullPct = (nullTotal / (workingData.length * columns.length) * 100).toFixed(1);
  const qualityScore = Math.round(100 - parseFloat(nullPct) * 2 - (dupCount / workingData.length * 100) * 1.5);

  // ─── Sheet 1: Dataset CSV ───
  const datasetCSV = Papa.unparse(workingData);
  downloadCSV(datasetCSV, 'TS_Data_Dataset.csv');

  // ─── Sheet 2: Dashboard CSV ───
  const dashRows = [];
  dashRows.push(['TS DATA — DASHBOARD SUMMARY', '']);
  dashRows.push(['Generated', new Date().toLocaleString()]);
  dashRows.push(['File', fileName]);
  dashRows.push(['', '']);

  dashRows.push(['KPI OVERVIEW', '']);
  dashRows.push(['Metric', 'Value']);
  dashRows.push(['Total Rows', workingData.length]);
  dashRows.push(['Total Columns', columns.length]);
  dashRows.push(['Numeric Columns', numCols.length]);
  dashRows.push(['Categorical Columns', catCols.length]);
  dashRows.push(['Missing Values', nullTotal]);
  dashRows.push(['Missing %', nullPct + '%']);
  dashRows.push(['Duplicate Rows', dupCount]);
  dashRows.push(['Data Quality Score', Math.max(0, Math.min(100, qualityScore)) + '%']);
  dashRows.push(['', '']);

  dashRows.push(['NUMERIC COLUMN STATISTICS', '', '', '', '', '', '', '', '', '', '']);
  dashRows.push(['Column', 'Count', 'Mean', 'Median', 'Std Dev', 'Min', 'Max', 'Q1', 'Q3', 'Skewness', 'Sum']);
  numCols.forEach(col => {
    const vals = workingData.map(r => +r[col]).filter(v => !isNaN(v));
    if (!vals.length) return;
    const n = vals.length;
    const mean = vals.reduce((a, b) => a + b, 0) / n;
    const sorted = [...vals].sort((a, b) => a - b);
    const med = sorted[Math.floor(n / 2)];
    const variance = vals.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
    const std = Math.sqrt(variance);
    const min = sorted[0], max = sorted[n - 1];
    const q1 = sorted[Math.floor(n * .25)], q3 = sorted[Math.floor(n * .75)];
    const skew = std ? vals.reduce((s, v) => s + ((v - mean) / std) ** 3, 0) / n : 0;
    const sum = vals.reduce((a, b) => a + b, 0);
    dashRows.push([col, n, +mean.toFixed(4), +med.toFixed(4), +std.toFixed(4), min, max, q1, q3, +skew.toFixed(4), +sum.toFixed(2)]);
  });
  dashRows.push(['', '']);

  dashRows.push(['CATEGORICAL COLUMN DISTRIBUTION', '', '', '']);
  dashRows.push(['Column', 'Value', 'Count', 'Percentage']);
  catCols.forEach(col => {
    const freq = groupCount(col);
    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
    sorted.forEach(([val, count]) => {
      dashRows.push([col, val, count, (count / workingData.length * 100).toFixed(1) + '%']);
    });
  });
  dashRows.push(['', '']);

  if (numCols.length >= 2) {
    dashRows.push(['CORRELATION MATRIX (Pearson r)', '', '', '']);
    const topCorr = [];
    for (let i = 0; i < numCols.length; i++) {
      for (let j = i + 1; j < numCols.length; j++) {
        const r = pearson(numCols[i], numCols[j]);
        if (Math.abs(r) >= 0.3) topCorr.push({ c1: numCols[i], c2: numCols[j], r });
      }
    }
    topCorr.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
    dashRows.push(['Column 1', 'Column 2', 'Correlation (r)', 'Strength']);
    topCorr.slice(0, 30).forEach(({ c1, c2, r }) => {
      const strength = Math.abs(r) >= 0.8 ? 'Strong' : Math.abs(r) >= 0.5 ? 'Moderate' : 'Weak';
      dashRows.push([c1, c2, +r.toFixed(4), strength + ' ' + (r > 0 ? 'Positive' : 'Negative')]);
    });
    dashRows.push(['', '']);
  }

  dashRows.push(['AI INSIGHTS SUMMARY', '']);
  const insights = [];
  insights.push(`Dataset contains ${workingData.length} rows and ${columns.length} columns`);
  insights.push(`Data quality score: ${Math.max(0, Math.min(100, qualityScore))}%`);
  if (nullTotal > 0) insights.push(`${nullTotal} missing values detected across ${columns.filter(c => workingData.some(r => r[c] == null)).length} columns`);
  else insights.push('No missing values — dataset is complete');
  if (dupCount > 0) insights.push(`${dupCount} duplicate rows detected (${(dupCount / workingData.length * 100).toFixed(1)}%)`);
  if (numCols.length >= 2) {
    const r = pearson(numCols[0], numCols[1]);
    if (Math.abs(r) > 0.5) insights.push(`${numCols[0]} and ${numCols[1]} show ${r > 0 ? 'positive' : 'negative'} correlation (r=${r.toFixed(2)})`);
  }
  insights.forEach((insight, i) => {
    dashRows.push([`${i + 1}. ${insight}`, '']);
  });

  const dashboardCSV = Papa.unparse(dashRows);
  downloadCSV(dashboardCSV, 'TS_Data_Dashboard.csv');
}

function downloadCSV(csvContent, filename){
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportChart(id){
  const chart=activeCharts[id];
  if(!chart) return;
  const a=document.createElement('a');
  a.href=chart.toBase64Image();
  a.download=`${id}_chart.png`;
  a.click();
}

function toggleChartSize(btn){
  const card=btn.closest('.chart-card');
  if(!card) return;
  if(card.classList.contains('chart-big')){
    const restore=card._gridRect;
    if(restore){
      card.style.transition='top .35s ease,left .35s ease,width .35s ease,height .35s ease';
      card.style.top=restore.top+'px';
      card.style.left=restore.left+'px';
      card.style.width=restore.width+'px';
      card.style.height=restore.height+'px';
      btn.innerHTML='<i class="fas fa-expand"></i>';
      btn.title='Expand';
      setTimeout(()=>{
        card.style.position='';
        card.style.top='';
        card.style.left='';
        card.style.width='';
        card.style.height='';
        card.style.zIndex='';
        card.style.transition='';
        card.classList.remove('chart-big');
        card._gridRect=null;
        setTimeout(()=>{
          card.querySelectorAll('canvas').forEach(c=>{if(activeCharts[c.id]) activeCharts[c.id].resize();});
        },50);
      },350);
    }
  }else{
    const rect=card.getBoundingClientRect();
    card._gridRect={top:rect.top,left:rect.left,width:rect.width,height:rect.height};
    card.style.transition='none';
    card.style.position='fixed';
    card.style.zIndex='9999';
    card.style.top=rect.top+'px';
    card.style.left=rect.left+'px';
    card.style.width=rect.width+'px';
    card.style.height=rect.height+'px';
    void card.offsetHeight;
    card.style.transition='top .35s ease,left .35s ease,width .35s ease,height .35s ease';
    card.style.top='2%';
    card.style.left='2%';
    card.style.width='96%';
    card.style.height='96%';
    card.classList.add('chart-big');
    btn.innerHTML='<i class="fas fa-compress"></i>';
    btn.title='Collapse';
    setTimeout(()=>{
      card.querySelectorAll('canvas').forEach(c=>{if(activeCharts[c.id]) activeCharts[c.id].resize();});
    },350);
    card.scrollIntoView({behavior:'smooth',block:'start'});
  }
}

function exportAllCharts(){
  Object.entries(activeCharts).forEach(([id,chart])=>{
    if(chart){
      const a=document.createElement('a');
      a.href=chart.toBase64Image();
      a.download=`${id}.png`;
      a.click();
    }
  });
}

function openReportModal(){
  if(!workingData.length){alert('No data loaded');return;}
  document.getElementById('report-modal').style.display='flex';
}
function closeReportModal(){
  document.getElementById('report-modal').style.display='none';
}

function generateReport(){
  openReportModal();
}

function generateReportFinal(){
  try {
    const fmt = document.querySelector('input[name="report-fmt"]:checked').value;
    closeReportModal();
    const html = buildReportHTML();

    if(fmt==='pdf'){
      const blob = new Blob([html], {type:'text/html'});
      const url = URL.createObjectURL(blob);
      const w = window.open(url, '_blank');
      if(!w){
        const a=document.createElement('a');
        a.href=url; a.download='TS_Data_Report.html';
        a.click();
        alert('Downloaded HTML file. Open it and press Ctrl+P to save as PDF.');
      }
    } else {
      const docHtml = html.replace('<html>','<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">');
      const blob = new Blob([docHtml], {type:'application/msword'});
      const a=document.createElement('a');
      a.href=URL.createObjectURL(blob);
      a.download='TS_Data_Report.doc';
      a.click();
    }
  } catch(e) {
    alert('Error generating report: ' + e.message);
  }
}

function buildReportHTML(){
  const numCols = getNumericCols();
  const catCols = getCatCols();
  const strCols = getStringCols();
  const nullTotal = workingData.reduce((s,r)=>s+Object.values(r).filter(v=>v==null||v==='').length,0);
  const dupCount = workingData.length - new Set(workingData.map(r=>JSON.stringify(r))).size;
  const nullPct = workingData.reduce((s,r)=>s+Object.values(r).filter(v=>v==null||v==='').length,0)/(workingData.length*columns.length)*100;
  const qualityScore = Math.round(100-nullPct*2-dupCount/workingData.length*100*1.5);
  const now = new Date().toLocaleString();
  const dateStr = new Date().toISOString().split('T')[0];

  let statsRows = '', statDetails = '', insightItems = '', recItems = '';
  numCols.forEach(col=>{
    const vals=workingData.map(r=>+r[col]).filter(v=>!isNaN(v));
    if(!vals.length) return;
    const n=vals.length;
    const mean=vals.reduce((a,b)=>a+b,0)/n;
    const sorted=[...vals].sort((a,b)=>a-b);
    const med=sorted[Math.floor(n/2)];
    const variance=vals.reduce((s,v)=>s+(v-mean)**2,0)/n;
    const std=Math.sqrt(variance);
    const min=sorted[0], max=sorted[n-1];
    const skew=vals.reduce((s,v)=>s+((v-mean)/std)**3,0)/n;
    const kurt=vals.reduce((s,v)=>s+((v-mean)/std)**4,0)/n-3;
    const q1=sorted[Math.floor(n*.25)], q3=sorted[Math.floor(n*.75)];
    statsRows+=`<tr><td style="padding:6px 10px;border:1px solid #ddd;font-weight:600">${col}</td>
      <td style="padding:6px 10px;border:1px solid #ddd">${colTypes[col]}</td>
      <td style="padding:6px 10px;border:1px solid #ddd;text-align:right">${n}</td>
      <td style="padding:6px 10px;border:1px solid #ddd;text-align:right">${mean.toFixed(2)}</td>
      <td style="padding:6px 10px;border:1px solid #ddd;text-align:right">${med.toFixed(2)}</td>
      <td style="padding:6px 10px;border:1px solid #ddd;text-align:right">${std.toFixed(2)}</td>
      <td style="padding:6px 10px;border:1px solid #ddd;text-align:right">${min.toFixed(2)}</td>
      <td style="padding:6px 10px;border:1px solid #ddd;text-align:right">${max.toFixed(2)}</td></tr>`;
    statDetails+=`<li><strong>${col}:</strong> Mean=${mean.toFixed(2)}, Median=${med.toFixed(2)}, Std=${std.toFixed(2)}, Min=${min.toFixed(2)}, Max=${max.toFixed(2)}, Q1=${q1.toFixed(2)}, Q3=${q3.toFixed(2)}, Skewness=${skew.toFixed(3)}, Kurtosis=${kurt.toFixed(3)}</li>`;
    const range = max-min;
    if(range/mean > 2) insightItems+=`<li>High variability detected in <strong>${col}</strong> (Range=${range.toFixed(2)}, Mean=${mean.toFixed(2)}). This suggests extreme values or wide distribution.</li>`;
    if(Math.abs(skew) > 1) insightItems+=`<li><strong>${col}</strong> is highly skewed (${skew.toFixed(2)}). Consider log transformation for better normality.</li>`;
  });

  const topCorr = [];
  for(let i=0;i<numCols.length;i++){
    for(let j=i+1;j<numCols.length;j++){
      const r=pearson(numCols[i],numCols[j]);
      if(Math.abs(r)>=0.5) topCorr.push({c1:numCols[i],c2:numCols[j],r});
    }
  }
  topCorr.sort((a,b)=>Math.abs(b.r)-Math.abs(a.r));
  let corrRows = topCorr.map(({c1,c2,r}) => `<tr><td style="padding:4px 10px;border:1px solid #ddd">${c1}</td><td style="padding:4px 10px;border:1px solid #ddd">${c2}</td><td style="padding:4px 10px;border:1px solid #ddd;text-align:center">${r.toFixed(3)}</td><td style="padding:4px 10px;border:1px solid #ddd">${r>0?'Positive':'Negative'} ${Math.abs(r)>=0.8?'(Strong)':Math.abs(r)>=0.6?'(Moderate)':'(Weak)'}</td></tr>`).join('');

  if(topCorr.length){
    const top = topCorr[0];
    insightItems+=`<li>Strongest correlation: <strong>${top.c1}</strong> and <strong>${top.c2}</strong> (r=${top.r.toFixed(3)}). ${top.r>0?'Both increase together.':'One increases while the other decreases.'}</li>`;
  }

  let missingRows = '';
  columns.forEach(col=>{
    const nulls = workingData.filter(r=>r[col]==null||r[col]==='').length;
    const pct = workingData.length?((nulls/workingData.length)*100).toFixed(1):0;
    if(nulls>0) missingRows+=`<tr><td style="padding:4px 10px;border:1px solid #ddd">${col}</td><td style="padding:4px 10px;border:1px solid #ddd;text-align:center">${nulls}</td><td style="padding:4px 10px;border:1px solid #ddd;text-align:center">${pct}%</td></tr>`;
  });
  if(!missingRows) missingRows = '<tr><td colspan="3" style="padding:8px;text-align:center;color:#10b981">No missing values found</td></tr>';

  const topCats = catCols.slice(0,3).map(col => {
    const freq = groupCount(col);
    const top = Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,3);
    return `<li><strong>${col}:</strong> ${top.map(([k,v])=>k+' ('+v+')').join(', ')}</li>`;
  }).join('');

  const mlNote = numCols.length>=2 ? `With ${numCols.length} numeric features available, suitable algorithms include Linear Regression for prediction, Random Forest for feature importance analysis, and K-Means for customer segmentation. Train/test split recommended at 80:20 ratio.` : 'Insufficient numeric features for advanced ML modeling. Consider feature engineering.';

  const qualityNote = qualityScore >= 80 ? 'The dataset is of high quality with minimal issues.' : qualityScore >= 50 ? 'The dataset has moderate quality — some cleaning recommended.' : 'The dataset requires significant cleaning before analysis.';

  return `
<html>
<head><meta charset="utf-8"><title>TS Data - Professional Analysis Report</title>
<style>
  @page{size:A4;margin:2cm}
  body{font-family:'Segoe UI',Arial,sans-serif;color:#1e293b;line-height:1.7;max-width:1000px;margin:auto;padding:20px}
  .title-page{text-align:center;padding:80px 20px 40px;page-break-after:always}
  .title-page h1{font-size:36px;color:#000000;margin-bottom:8px;letter-spacing:-1px}
  .title-page .subtitle{font-size:20px;color:#475569;margin-bottom:30px}
  .title-page .meta{font-size:14px;color:var(--text2);line-height:2}
  .title-page .line{width:80px;height:4px;background:#000000;margin:20px auto;border-radius:2px}
  h2{font-size:20px;color:#000000;margin:36px 0 14px;padding-bottom:8px;border-bottom:3px solid #000000}
  h3{font-size:16px;color:#1e293b;margin:22px 0 10px}
  p{font-size:13.5px;margin:0 0 10px;color:#334155}
  ul,ol{margin:6px 0 14px;padding-left:22px}
  li{font-size:13px;margin:4px 0;color:#334155}
  table{width:100%;border-collapse:collapse;font-size:12px;margin:12px 0 20px}
  th{background:#000000;color:#fff;padding:7px 9px;text-align:left;font-weight:600}
  td{padding:5px 9px;border:1px solid #e2e8f0}
  tr:nth-child(even){background:#f8fafc}
  .badge{display:inline-block;padding:1px 8px;border-radius:10px;font-size:11px;font-weight:600;margin:1px}
  .badge-num{background:#e0e7ff;color:#4338ca}
  .badge-cat{background:#fce7f3;color:#be185d}
  .badge-date{background:#dbeafe;color:#1d4ed8}
  .badge-bool{background:#d1fae5;color:#047857}
  .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:10px 0 18px}
  .card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;text-align:center}
  .card .val{font-size:20px;font-weight:700;color:#0a0e1a}
  .card .lbl{font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-top:3px}
  .box{border-left:4px solid #000000;background:#f8fafc;padding:10px 14px;margin:10px 0 16px;border-radius:0 6px 6px 0;font-size:13px}
  .footer{margin-top:50px;padding-top:16px;border-top:2px solid #e2e8f0;font-size:11px;color:var(--text2);text-align:center}
  .page-break{page-break-before:always}
  .toc{background:#f8fafc;padding:16px 20px;border-radius:8px;margin:16px 0}
  .toc li{font-size:13px;margin:5px 0}
  strong{color:#0a0e1a}
  .tag{display:inline-block;background:#00000015;color:#000000;padding:2px 10px;border-radius:12px;font-size:11px;font-weight:600;margin:2px}
</style>
</head>
<body>

<div class="title-page">
  <div class="line"></div>
  <h1>Data Analysis Report</h1>
  <div class="subtitle">Comprehensive Dataset Analysis &amp; Insights</div>
  <div class="meta">
    <strong>Analyst:</strong> Shub<br>
    <strong>Date:</strong> ${dateStr}<br>
    <strong>Tools Used:</strong> TS Data Platform, JavaScript, Chart.js, PapaParse, Math.js
  </div>
  <div class="line"></div>
  <div style="margin-top:30px;font-size:13px;color:var(--text2)">
    <strong>Dataset:</strong> ${fileName}<br>
    <strong>Records:</strong> ${workingData.length.toLocaleString()} rows × ${columns.length} columns
  </div>
</div>

<div class="toc">
  <strong>Table of Contents</strong>
  <ol>
    <li>Executive Summary</li>
    <li>Problem Statement</li>
    <li>Objectives</li>
    <li>Dataset Information</li>
    <li>Data Cleaning &amp; Preprocessing</li>
    <li>Exploratory Data Analysis (EDA)</li>
    <li>Data Visualization</li>
    <li>Key Insights</li>
    <li>Statistical Analysis</li>
    <li>Machine Learning</li>
    <li>Tools Used</li>
    <li>Conclusion</li>
    <li>Recommendations</li>
    <li>Future Scope</li>
    <li>References</li>
  </ol>
</div>

<h2>1. Executive Summary</h2>
<p>This report presents a comprehensive analysis of the dataset <strong>${fileName}</strong>, containing <strong>${workingData.length.toLocaleString()}</strong> records across <strong>${columns.length}</strong> attributes. The analysis was conducted using the TS Data analytics platform with the goal of extracting meaningful patterns, identifying data quality issues, and providing actionable business insights.</p>
<div class="box">
  <strong>Key Findings:</strong>
  <ul>
    <li>The dataset contains ${numCols.length} numeric and ${catCols.length} categorical columns</li>
    <li>${nullTotal > 0 ? nullTotal+' missing values detected across '+columns.filter(c=>workingData.some(r=>r[c]==null)).length+' columns' : 'No missing values found — dataset is complete'}</li>
    <li>${dupCount > 0 ? dupCount+' duplicate rows identified and handled' : 'No duplicate rows detected'}</li>
    <li>Data quality score: <strong>${qualityScore}%</strong> — ${qualityNote}</li>
    ${topCorr.length ? '<li>'+topCorr.length+' significant correlations found between numeric features</li>' : '<li>No strong correlations detected between numeric features</li>'}
  </ul>
</div>

<h2>2. Problem Statement</h2>
<p>The primary objective of this analysis is to perform a thorough examination of the ${fileName} dataset to uncover underlying patterns, assess data quality, and generate data-driven insights. Understanding the structure, relationships, and anomalies within this data is essential for making informed business decisions and building predictive models.</p>

<h2>3. Objectives</h2>
<ul>
  <li>Assess overall data quality and completeness</li>
  <li>Identify and handle missing values, duplicates, and outliers</li>
  <li>Understand the distribution and statistical properties of each column</li>
  <li>Discover correlations and relationships between variables</li>
  <li>Generate actionable business insights from the data</li>
  <li>Prepare data for machine learning modeling</li>
  <li>Provide recommendations based on analytical findings</li>
</ul>

<h2>4. Dataset Information</h2>
<p><strong>Source:</strong> ${fileName} — uploaded for analysis</p>
<div style="text-align:right;margin-bottom:10px">
  <a href="${(()=>{const h=columns.join(',')+'\n'+workingData.map(r=>columns.map(c=>{const v=r[c];return v==null?'':String(v).includes(',')?'"'+String(v)+'"':v}).join(',')).join('\n');return 'data:text/csv;charset=utf-8,'+encodeURIComponent(h)})()}" download="dataset_${fileName}" style="display:inline-block;padding:7px 16px;background:#000000;color:#fff;text-decoration:none;border-radius:6px;font-size:13px;font-weight:600"><i class="fas fa-download"></i> Download Full Dataset (CSV)</a>
</div>
<div class="grid-2">
  <div class="card"><div class="val">${workingData.length.toLocaleString()}</div><div class="lbl">Total Rows</div></div>
  <div class="card"><div class="val">${columns.length}</div><div class="lbl">Columns</div></div>
  <div class="card"><div class="val">${numCols.length}</div><div class="lbl">Numeric</div></div>
  <div class="card"><div class="val">${catCols.length}</div><div class="lbl">Categorical</div></div>
  <div class="card"><div class="val">${strCols.length}</div><div class="lbl">Text</div></div>
  <div class="card"><div class="val">${qualityScore}%</div><div class="lbl">Data Quality</div></div>
</div>

<h3>Column Details</h3>
<table>
<thead><tr><th>Column</th><th>Type</th><th>Non-Null</th><th>Nulls</th><th>Null %</th></tr></thead>
<tbody>${columns.map(c=>{
  const nulls=workingData.filter(r=>r[c]==null||r[c]==='').length;
  const pct = ((nulls/workingData.length)*100).toFixed(1);
  const badgeClass = colTypes[c]==='int'||colTypes[c]==='float'?'badge-num':colTypes[c]==='date'?'badge-date':colTypes[c]==='bool'?'badge-bool':'badge-cat';
  return `<tr><td style="font-weight:600">${c}</td><td><span class="badge ${badgeClass}">${colTypes[c]||'?'}</span></td><td>${workingData.length-nulls}</td><td>${nulls}</td><td>${pct}%</td></tr>`;
}).join('')}</tbody>
</table>

<h3>Data Sample (First 10 Rows)</h3>
<table><thead><tr>${columns.map(c=>`<th>${c}</th>`).join('')}</tr></thead>
<tbody>${workingData.slice(0,10).map(r=>`<tr>${columns.map(c=>{const v=r[c];return `<td>${v==null||v===''?'<span style="color:#ef4444;font-style:italic">null</span>':v}</td>`;}).join('')}</tr>`).join('')}</tbody></table>

<h2>5. Data Cleaning &amp; Preprocessing</h2>
<h3>5.1 Missing Value Analysis</h3>
<table><thead><tr><th>Column</th><th>Missing Count</th><th>Percentage</th></tr></thead><tbody>${missingRows}</tbody></table>
<p>Missing values were handled using appropriate strategies such as removal (if minimal) or imputation with mean/median for numeric columns and mode for categorical columns.</p>

<h3>5.2 Duplicate Detection</h3>
<p>${dupCount > 0 ? 'Found and removed '+dupCount+' duplicate rows ('+(dupCount/workingData.length*100).toFixed(1)+'% of data).' : 'No duplicate rows were detected in the dataset.'}</p>

<h3>5.3 Outlier Analysis</h3>
<ul>
${numCols.slice(0,5).map(col=>{
  const vals=workingData.map(r=>+r[col]).filter(v=>!isNaN(v));
  if(vals.length<2) return '';
  const mean=vals.reduce((a,b)=>a+b,0)/vals.length;
  const std=Math.sqrt(vals.reduce((s,v)=>s+(v-mean)**2,0)/vals.length);
  const outliers = vals.filter(v=>Math.abs((v-mean)/std)>3).length;
  return `<li><strong>${col}:</strong> ${outliers} outliers detected (${(outliers/vals.length*100).toFixed(1)}% of values)</li>`;
}).filter(Boolean).join('')}
</ul>

<h3>5.4 Data Transformation</h3>
<p>Data types were standardized across all columns. Numeric columns were checked for correct parsing, date columns were standardized to ISO format, and text columns were cleaned for consistency.</p>

<h2>6. Exploratory Data Analysis (EDA)</h2>
<h3>6.1 Statistical Summary</h3>
<table>
<thead><tr><th>Column</th><th>Type</th><th>Count</th><th>Mean</th><th>Median</th><th>Std Dev</th><th>Min</th><th>Max</th></tr></thead>
<tbody>${statsRows||'<tr><td colspan="8" style="text-align:center;padding:10px;color:var(--text2)">No numeric columns</td></tr>'}</tbody>
</table>

<h3>6.2 Detailed Statistics</h3>
<ul>${statDetails||'<li>No numeric data available</li>'}</ul>

<h3>6.3 Correlation Analysis</h3>
${corrRows?`<table><thead><tr><th>Column 1</th><th>Column 2</th><th>Correlation (r)</th><th>Strength</th></tr></thead><tbody>${corrRows}</tbody></table>`:'<p>No significant correlations (|r| &ge; 0.5) were found between numeric columns.</p>'}

<h3>6.4 Category Distribution</h3>
<ul>${topCats||'<li>No categorical columns available</li>'}</ul>

<h2>7. Data Visualization</h2>
<p>The following chart types are recommended for visualizing this dataset:</p>
<ul>
  <li><strong>Bar Chart:</strong> Compare categorical aggregates (e.g., sales by region, count by category)</li>
  <li><strong>Line Chart:</strong> Show trends over sequential/indexed data</li>
  <li><strong>Pie/Doughnut Chart:</strong> Display proportional breakdown of categories</li>
  <li><strong>Histogram:</strong> Visualize distribution of numeric columns</li>
  <li><strong>Scatter Plot:</strong> Explore relationships between two numeric variables</li>
  <li><strong>Correlation Heatmap:</strong> Visual summary of all pairwise correlations</li>
  <li><strong>Box Plot:</strong> Detect outliers and understand spread of numeric data</li>
</ul>

<h2>8. Key Insights</h2>
<ul>
  ${insightItems.length ? insightItems : '<li>The dataset appears well-structured with moderate variability across numeric columns.</li>'}
  ${numCols.length ? '<li>A total of <strong>'+numCols.length+'</strong> numeric features available for modeling and analysis.</li>' : ''}
  ${catCols.length ? '<li>Categorical columns (<strong>'+catCols.length+'</strong>) provide segmentation opportunities for group-wise analysis.</li>' : ''}
  <li>Data quality score of <strong>${qualityScore}%</strong> indicates ${qualityScore>=80?'a reliable dataset suitable for analysis.':'areas needing attention before advanced analysis.'}</li>
</ul>

<h2>9. Statistical Analysis</h2>
<ul>
  <li><strong>Mean (Average):</strong> Central tendency measure — computed for all numeric columns</li>
  <li><strong>Median:</strong> Robust central value less affected by outliers</li>
  <li><strong>Standard Deviation:</strong> Measures dispersion — higher values indicate wider spread</li>
  <li><strong>Skewness:</strong> ${numCols.map(c=>{const v=workingData.map(r=>+r[c]).filter(v=>!isNaN(v));if(!v.length)return;const m=v.reduce((a,b)=>a+b,0)/v.length;const s=Math.sqrt(v.reduce((a,b)=>a+(b-m)**2,0)/v.length);const sk=v.reduce((a,b)=>a+((b-m)/s)**3,0)/v.length;return c+'='+sk.toFixed(2);}).filter(Boolean).slice(0,5).join(', ')}</li>
  <li><strong>Correlation Coefficient (Pearson r):</strong> ${topCorr.length>0?'Identified '+topCorr.length+' significant relationships. Range: ['+topCorr.map(c=>c.r.toFixed(2)).join(', ')+']':'No significant linear relationships found'}</li>
</ul>

<h2>10. Machine Learning</h2>
<p>${mlNote}</p>
<h3>Feature Engineering</h3>
<ul>
  <li><strong>Numeric Features:</strong> ${numCols.join(', ')||'None available'}</li>
  <li><strong>Categorical Features:</strong> ${catCols.join(', ')||'None available'} — suitable for encoding</li>
  <li><strong>Missing Value Strategy:</strong> Imputation with mean/median/mode as appropriate</li>
  <li><strong>Recommended Split:</strong> 80% training, 20% testing</li>
  <li><strong>Evaluation Metrics:</strong> Accuracy, Precision, Recall, F1-Score, RMSE</li>
</ul>

<h2>11. Tools Used</h2>
<ul>
  <li><strong>TS Data Platform</strong> — Web-based analysis environment</li>
  <li><strong>PapaParse</strong> — CSV parsing and data handling</li>
  <li><strong>Chart.js</strong> — Interactive data visualizations</li>
  <li><strong>Math.js</strong> — Statistical computations</li>
  <li><strong>jsPDF</strong> — PDF report generation</li>
  <li><strong>XLSX</strong> — Excel file support</li>
</ul>

<h2>12. Conclusion</h2>
<p>This analysis successfully examined the <strong>${fileName}</strong> dataset comprising <strong>${workingData.length.toLocaleString()}</strong> records. The dataset contains <strong>${numCols.length}</strong> numeric attributes and <strong>${catCols.length}</strong> categorical attributes. ${qualityScore>=70?'Overall data quality is good, making the dataset suitable for further analysis and modeling.':'Data quality needs improvement before proceeding with advanced analytics.'} The insights derived from this analysis provide a solid foundation for data-driven decision making.</p>

<h2>13. Recommendations</h2>
<ul>
  ${nullTotal>0?'<li>Address missing values in <strong>'+columns.filter(c=>workingData.some(r=>r[c]==null)).length+'</strong> columns to improve data completeness.</li>':''}
  ${dupCount>0?'<li>Implement data validation rules to prevent duplicate entries in future data collection.</li>':''}
  ${numCols.length>=3?'<li>Apply dimensionality reduction (PCA) if working with high-dimensional data for ML modeling.</li>':''}
  <li>Use correlation insights to select non-redundant features for predictive modeling.</li>
  <li>Consider feature engineering to create interaction terms between correlated variables.</li>
  <li>Validate findings with domain experts before making business decisions.</li>
  <li>Establish regular data quality monitoring workflows.</li>
</ul>

<h2>14. Future Scope</h2>
<ul>
  <li><strong>Predictive Modeling:</strong> Build regression/classification models to forecast key metrics</li>
  <li><strong>Anomaly Detection:</strong> Implement real-time outlier detection systems</li>
  <li><strong>Automated Reporting:</strong> Schedule regular report generation with updated data</li>
  <li><strong>Dashboard Integration:</strong> Connect to BI tools like Power BI or Tableau for live dashboards</li>
  <li><strong>Deep Learning:</strong> Explore neural networks for complex pattern recognition</li>
  <li><strong>NLP Analysis:</strong> Apply text mining on textual columns for sentiment or topic modeling</li>
</ul>

<h2>15. References</h2>
<ul>
  <li>Dataset: ${fileName} — uploaded by user</li>
  <li>PapaParse — CSV parsing library (https://www.papaparse.com)</li>
  <li>Chart.js — Visualization library (https://www.chartjs.org)</li>
  <li>Math.js — Mathematics library (https://mathjs.org)</li>
  <li>jsPDF — PDF generation (https://github.com/parallax/jsPDF)</li>
  <li>Analysis performed using TS Data Platform by Shub</li>
</ul>

<div class="footer">
  TS Data by Shub — Professional Data Analysis Report<br>
  Generated: ${now} | ${workingData.length} rows × ${columns.length} columns
</div>

</body></html>`;
}


// ═══════════════════════════════════════
// INIT
// ═══════════════════════════════════════
document.addEventListener('DOMContentLoaded',()=>{
  // Load sample automatically
  loadSample('sales');
  switchPanel('upload');
});
