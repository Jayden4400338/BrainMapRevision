
(function() {
    
    
    
    let currentUser = null;
    let allBoards = [];
    let allSubjects = [];
    let currentView = 'grid';
    let currentFilter = '';
    let editingBoard = null;
    let currentBoardContent = [];

    
    
    
    const loadingState = document.getElementById('loadingState');
    const errorState = document.getElementById('errorState');
    const emptyState = document.getElementById('emptyState');
    const boardsGrid = document.getElementById('boardsGrid');
    const createBoardBtn = document.getElementById('createBoardBtn');
    const viewBtns = document.querySelectorAll('.view-btn');
    
    
    const boardModal = document.getElementById('boardModal');
    const editorModal = document.getElementById('editorModal');
    const boardForm = document.getElementById('boardForm');

    
    
    
    class CustomSelect {
        constructor(selectId, options = []) {
            this.selectId = selectId;
            this.options = options;
            this.selectedValue = '';
            this.selectedText = 'All Subjects';
            this.isOpen = false;
            this.onChange = null;
            
            this.render();
        }

        render() {
            const container = document.getElementById(this.selectId);
            if (!container) return;

            const customSelect = document.createElement('div');
            customSelect.className = 'custom-select';
            customSelect.innerHTML = `
                <div class="select-trigger" data-select="${this.selectId}">
                    <span class="select-text">${this.selectedText}</span>
                </div>
                <div class="select-dropdown">
                    ${this.options.map(opt => `
                        <div class="select-option ${opt.value === this.selectedValue ? 'selected' : ''}" 
                             data-value="${opt.value}">
                            ${opt.text}
                        </div>
                    `).join('')}
                </div>
            `;

            container.replaceWith(customSelect);
            this.attachEvents();
        }

        attachEvents() {
            const trigger = document.querySelector(`[data-select="${this.selectId}"]`);
            const dropdown = trigger?.nextElementSibling;
            
            if (!trigger || !dropdown) return;

            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggle();
            });

            dropdown.querySelectorAll('.select-option').forEach(option => {
                option.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.select(option.dataset.value, option.textContent.trim());
                });
            });

            
            document.addEventListener('click', () => {
                if (this.isOpen) this.close();
            });
        }

        toggle() {
            const trigger = document.querySelector(`[data-select="${this.selectId}"]`);
            const dropdown = trigger?.nextElementSibling;
            
            if (!trigger || !dropdown) return;

            this.isOpen = !this.isOpen;
            trigger.classList.toggle('active', this.isOpen);
            dropdown.classList.toggle('active', this.isOpen);
        }

        close() {
            const trigger = document.querySelector(`[data-select="${this.selectId}"]`);
            const dropdown = trigger?.nextElementSibling;
            
            if (!trigger || !dropdown) return;

            this.isOpen = false;
            trigger.classList.remove('active');
            dropdown.classList.remove('active');
        }

        select(value, text) {
            this.selectedValue = value;
            this.selectedText = text;
            
            const trigger = document.querySelector(`[data-select="${this.selectId}"]`);
            const textEl = trigger?.querySelector('.select-text');
            
            if (textEl) textEl.textContent = text;

            
            const dropdown = trigger?.nextElementSibling;
            dropdown?.querySelectorAll('.select-option').forEach(opt => {
                opt.classList.toggle('selected', opt.dataset.value === value);
            });

            this.close();
            
            if (this.onChange) this.onChange(value);
        }

        updateOptions(options) {
            this.options = options;
            this.render();
        }

        getValue() {
            return this.selectedValue;
        }
    }

    
    
    
    function showConfirm(title, message, onConfirm) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); z-index: 10000;';

        const dialog = document.createElement('div');
        dialog.className = 'confirmation-dialog';
        dialog.innerHTML = `
            <h3>${title}</h3>
            <p>${message}</p>
            <div class="confirmation-actions">
                <button class="btn-cancel">Cancel</button>
                <button class="btn-confirm">Confirm</button>
            </div>
        `;

        document.body.appendChild(overlay);
        document.body.appendChild(dialog);

        const close = () => {
            overlay.remove();
            dialog.remove();
        };

        dialog.querySelector('.btn-cancel').onclick = close;
        dialog.querySelector('.btn-confirm').onclick = () => {
            close();
            onConfirm();
        };
        overlay.onclick = close;
    }

    
    
    
    async function init() {
      
        
        await loadCurrentUser();
        await loadSubjects();
        await loadBoards();
        setupEventListeners();
        
        
    }

    
    
    
    async function loadCurrentUser() {
        try {
            const { data: { user }, error } = await window.supabaseClient.auth.getUser();
            
            if (error) throw error;
            
            if (!user) {
                window.location.href = '../auth/login.html';
                return;
            }

            currentUser = user;
           
            
        } catch (error) {
            
            showError('Failed to load user data');
        }
    }

    
    
    
    let subjectFilter, boardSubjectSelect;

    async function loadSubjects() {
        try {
            const { data, error } = await window.supabaseClient
                .from('subjects')
                .select('id, name, slug')
                .order('name');

            if (error) throw error;

            allSubjects = data;
            
            
            const filterOptions = [
                { value: '', text: 'All Subjects' },
                ...data.map(s => ({ value: s.id.toString(), text: s.name }))
            ];

            const boardOptions = [
                { value: '', text: 'None' },
                ...data.map(s => ({ value: s.id.toString(), text: s.name }))
            ];

            subjectFilter = new CustomSelect('subjectFilter', filterOptions);
            subjectFilter.onChange = (value) => {
                currentFilter = value;
                loadBoards();
            };

            boardSubjectSelect = new CustomSelect('boardSubject', boardOptions);
            
        } catch (error) {
            
        }
    }

    
    
    
    async function loadBoards() {
        try {
            showLoading();
            
            let query = window.supabaseClient
                .from('revision_boards')
                .select(`
                    *,
                    subjects (
                        name,
                        slug
                    )
                `)
                .eq('user_id', currentUser.id)
                .order('updated_at', { ascending: false });

            if (currentFilter) {
                query = query.eq('subject_id', currentFilter);
            }

            const { data, error } = await query;

            if (error) throw error;

            allBoards = data;
            displayBoards(data);
            hideLoading();
            
        } catch (error) {
            
            showError();
        }
    }

    
    
    
    function displayBoards(boards) {
        if (boards.length === 0) {
            showEmpty();
            return;
        }

        hideEmpty();
        boardsGrid.innerHTML = '';
        boardsGrid.style.display = 'grid';

        boards.forEach(board => {
            const card = createBoardCard(board);
            boardsGrid.appendChild(card);
        });

        boardsGrid.className = currentView === 'grid' ? 'boards-grid' : 'boards-grid list-view';
    }

    function createBoardCard(board) {
        const card = document.createElement('div');
        card.className = 'board-card';
        
        const subjectName = board.subjects?.name || 'No Subject';
        const itemCount = board.content?.items?.length || 0;
        const updatedDate = new Date(board.updated_at).toLocaleDateString();

        card.innerHTML = `
            ${board.is_public ? '<span class="board-badge">Public</span>' : ''}
            
            <div class="board-header">
                <div>
                    ${board.subject_id ? `<span class="board-subject">${subjectName}</span>` : ''}
                    <h3 class="board-title">${board.title}</h3>
                </div>
            </div>

            ${board.description ? `<p class="board-description">${board.description}</p>` : ''}

            <div class="board-meta">
                <span>
                    <i class="fa-solid fa-note-sticky"></i>
                    ${itemCount} items
                </span>
                <span>
                    <i class="fa-solid fa-calendar"></i>
                    ${updatedDate}
                </span>
            </div>

            <div class="board-actions">
                <button onclick="window.openBoardEditor(${board.id})">
                    <i class="fa-solid fa-pen"></i>
                    Edit
                </button>
                <button onclick="window.duplicateBoard(${board.id})">
                    <i class="fa-solid fa-copy"></i>
                    Duplicate
                </button>
                <button class="delete-btn" onclick="window.deleteBoard(${board.id})">
                    <i class="fa-solid fa-trash"></i>
                    Delete
                </button>
            </div>
        `;

        return card;
    }

    
    
    
    window.openCreateModal = function() {
        editingBoard = null;
        document.getElementById('modalTitle').textContent = 'Create New Board';
        document.getElementById('boardTitle').value = '';
        document.getElementById('boardDescription').value = '';
        boardSubjectSelect.select('', 'None');
        document.getElementById('boardPublic').checked = false;
        
        boardModal.style.display = 'flex';
    };

    window.closeBoardModal = function() {
        boardModal.style.display = 'none';
        editingBoard = null;
    };

    if (boardForm) {
        boardForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const title = document.getElementById('boardTitle').value.trim();
            const description = document.getElementById('boardDescription').value.trim();
            const subjectId = boardSubjectSelect.getValue() || null;
            const isPublic = document.getElementById('boardPublic').checked;

            try {
                const boardData = {
                    user_id: currentUser.id,
                    title: title,
                    description: description || null,
                    subject_id: subjectId ? parseInt(subjectId) : null,
                    is_public: isPublic,
                    content: { items: [] }
                };

                if (editingBoard) {
                    const { error } = await window.supabaseClient
                        .from('revision_boards')
                        .update(boardData)
                        .eq('id', editingBoard.id);

                    if (error) throw error;
                    
                    showNotification('Board updated successfully!', 'success');
                } else {
                    const { error } = await window.supabaseClient
                        .from('revision_boards')
                        .insert(boardData);

                    if (error) throw error;
                    
                    await awardXP(25, 'Created revision board');
                    showNotification('Board created! +25 XP', 'success');
                }

                closeBoardModal();
                await loadBoards();
                
            } catch (error) {
               
                showNotification('Failed to save board', 'error');
            }
        });
    }

    
    
    
    window.openBoardEditor = async function(boardId) {
        try {
            const { data, error } = await window.supabaseClient
                .from('revision_boards')
                .select('*')
                .eq('id', boardId)
                .single();

            if (error) throw error;

            editingBoard = data;
            currentBoardContent = data.content?.items || [];
            
            document.getElementById('editorBoardTitle').textContent = data.title;
            displayEditorContent();
            
            editorModal.style.display = 'flex';
            
        } catch (error) {
           
            showNotification('Failed to load board', 'error');
        }
    };

    window.closeEditorModal = function() {
        editorModal.style.display = 'none';
        editingBoard = null;
        currentBoardContent = [];
    };

    function displayEditorContent() {
        const container = document.getElementById('editorContent');
        
        if (currentBoardContent.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 40px;">No items yet. Use the toolbar above to add content!</p>';
            return;
        }

        container.innerHTML = currentBoardContent.map((item, index) => {
            switch(item.type) {
                case 'note':
                    return createNoteItem(item, index);
                case 'flashcard':
                    return createFlashcardItem(item, index);
                case 'link':
                    return createLinkItem(item, index);
                default:
                    return '';
            }
        }).join('');

        
        attachRichTextListeners();
    }

    function createNoteItem(item, index) {
        return `
            <div class="editor-item" data-index="${index}">
                <div class="editor-item-header">
                    <span class="editor-item-type">
                        <i class="fa-solid fa-note-sticky"></i>
                        Note
                    </span>
                    <div class="editor-item-actions">
                        <button onclick="window.deleteItem(${index})"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
                <div class="rich-text-editor" 
                     contenteditable="true" 
                     data-index="${index}"
                     data-placeholder="Start typing...">${item.content || ''}</div>
                <div class="rich-text-toolbar">
                    <button class="text-tool-btn" data-command="bold" title="Bold"><b>B</b></button>
                    <button class="text-tool-btn" data-command="italic" title="Italic"><i>I</i></button>
                    <button class="text-tool-btn" data-command="underline" title="Underline"><u>U</u></button>
                    <div class="text-tool-separator"></div>
                    <button class="text-tool-btn" data-command="formatBlock" data-value="h1" title="Header 1">H1</button>
                    <button class="text-tool-btn" data-command="formatBlock" data-value="h2" title="Header 2">H2</button>
                    <button class="text-tool-btn" data-command="formatBlock" data-value="p" title="Paragraph">P</button>
                    <div class="text-tool-separator"></div>
                    <div class="color-picker-wrapper">
                        <button class="text-tool-btn" title="Text Color">
                            <i class="fa-solid fa-palette"></i>
                        </button>
                        <div class="color-picker">
                            <div class="color-grid">
                                <div class="color-swatch" style="background: #000000" data-color="#000000"></div>
                                <div class="color-swatch" style="background: #F56565" data-color="#F56565"></div>
                                <div class="color-swatch" style="background: #48BB78" data-color="#48BB78"></div>
                                <div class="color-swatch" style="background: #3B82F6" data-color="#3B82F6"></div>
                                <div class="color-swatch" style="background: #A78BFA" data-color="#A78BFA"></div>
                                <div class="color-swatch" style="background: #EC4899" data-color="#EC4899"></div>
                                <div class="color-swatch" style="background: #F59E0B" data-color="#F59E0B"></div>
                                <div class="color-swatch" style="background: #10B981" data-color="#10B981"></div>
                                <div class="color-swatch" style="background: #8B5CF6" data-color="#8B5CF6"></div>
                                <div class="color-swatch" style="background: #FFFFFF; border: 1px solid #ccc" data-color="#FFFFFF"></div>
                            </div>
                        </div>
                    </div>
                    <div class="font-size-picker">
                        <button class="text-tool-btn" title="Font Size">
                            <i class="fa-solid fa-text-height"></i>
                        </button>
                        <div class="font-size-dropdown">
                            <div class="font-size-option" data-size="1">Small</div>
                            <div class="font-size-option" data-size="3">Normal</div>
                            <div class="font-size-option" data-size="5">Large</div>
                            <div class="font-size-option" data-size="7">Huge</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function createFlashcardItem(item, index) {
        return `
            <div class="editor-item" data-index="${index}">
                <div class="editor-item-header">
                    <span class="editor-item-type">
                        <i class="fa-solid fa-layer-group"></i>
                        Flashcard
                    </span>
                    <div class="editor-item-actions">
                        <button onclick="window.deleteItem(${index})"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
                <div class="flashcard-content">
                    <div class="flashcard-side">
                        <div class="flashcard-label">Front</div>
                        <textarea class="flashcard-input" data-index="${index}" data-side="front" placeholder="Question or term...">${item.front || ''}</textarea>
                    </div>
                    <div class="flashcard-side">
                        <div class="flashcard-label">Back</div>
                        <textarea class="flashcard-input" data-index="${index}" data-side="back" placeholder="Answer or definition...">${item.back || ''}</textarea>
                    </div>
                </div>
            </div>
        `;
    }

    function createLinkItem(item, index) {
        return `
            <div class="editor-item" data-index="${index}">
                <div class="editor-item-header">
                    <span class="editor-item-type">
                        <i class="fa-solid fa-link"></i>
                        Link
                    </span>
                    <div class="editor-item-actions">
                        <button onclick="window.deleteItem(${index})"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
                <div class="link-content">
                    <div class="link-input-group">
                        <input type="text" class="link-input" data-index="${index}" data-field="title" placeholder="Link title" value="${item.title || ''}">
                        <input type="url" class="link-input" data-index="${index}" data-field="url" placeholder="https:
                    </div>
                </div>
            </div>
        `;
    }

    function attachRichTextListeners() {
        
        document.querySelectorAll('.text-tool-btn[data-command]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const command = btn.dataset.command;
                const value = btn.dataset.value || null;
                document.execCommand(command, false, value);
            });
        });

        
        document.querySelectorAll('.color-picker-wrapper > button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const picker = btn.nextElementSibling;
                picker.classList.toggle('active');
            });
        });

        document.querySelectorAll('.color-swatch').forEach(swatch => {
            swatch.addEventListener('click', (e) => {
                e.stopPropagation();
                const color = swatch.dataset.color;
                document.execCommand('foreColor', false, color);
                document.querySelector('.color-picker.active')?.classList.remove('active');
            });
        });

        
        document.querySelectorAll('.font-size-picker > button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const dropdown = btn.nextElementSibling;
                dropdown.classList.toggle('active');
            });
        });

        document.querySelectorAll('.font-size-option').forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                const size = option.dataset.size;
                document.execCommand('fontSize', false, size);
                document.querySelector('.font-size-dropdown.active')?.classList.remove('active');
            });
        });

        
        document.querySelectorAll('.rich-text-editor').forEach(editor => {
            editor.addEventListener('blur', () => {
                const index = parseInt(editor.dataset.index);
                if (currentBoardContent[index]) {
                    currentBoardContent[index].content = editor.innerHTML;
                }
            });
        });

        
        document.querySelectorAll('.flashcard-input').forEach(input => {
            input.addEventListener('blur', () => {
                const index = parseInt(input.dataset.index);
                const side = input.dataset.side;
                if (currentBoardContent[index]) {
                    currentBoardContent[index][side] = input.value;
                }
            });
        });

        
        document.querySelectorAll('.link-input').forEach(input => {
            input.addEventListener('blur', () => {
                const index = parseInt(input.dataset.index);
                const field = input.dataset.field;
                if (currentBoardContent[index]) {
                    currentBoardContent[index][field] = input.value;
                }
            });
        });

        
        document.addEventListener('click', () => {
            document.querySelectorAll('.color-picker.active, .font-size-dropdown.active').forEach(el => {
                el.classList.remove('active');
            });
        });
    }

    
    
    
    window.addNote = function() {
        currentBoardContent.push({
            type: 'note',
            content: '',
            created_at: new Date().toISOString()
        });
        displayEditorContent();
    };

    window.addFlashcard = function() {
        currentBoardContent.push({
            type: 'flashcard',
            front: '',
            back: '',
            created_at: new Date().toISOString()
        });
        displayEditorContent();
    };

    window.addLink = function() {
        currentBoardContent.push({
            type: 'link',
            url: '',
            title: '',
            created_at: new Date().toISOString()
        });
        displayEditorContent();
    };

    window.deleteItem = function(index) {
        showConfirm(
            'Delete Item?',
            'Are you sure you want to delete this item? This cannot be undone.',
            () => {
                currentBoardContent.splice(index, 1);
                displayEditorContent();
            }
        );
    };

    window.saveBoardContent = async function() {
        try {
            const { error } = await window.supabaseClient
                .from('revision_boards')
                .update({
                    content: { items: currentBoardContent },
                    updated_at: new Date().toISOString()
                })
                .eq('id', editingBoard.id);

            if (error) throw error;

            showNotification('Board saved successfully!', 'success');
            closeEditorModal();
            await loadBoards();
            
        } catch (error) {
         
            showNotification('Failed to save board', 'error');
        }
    };

    
    
    
    window.deleteBoard = async function(boardId) {
        showConfirm(
            'Delete Board?',
            'Are you sure you want to delete this board? This cannot be undone.',
            async () => {
                try {
                    const { error } = await window.supabaseClient
                        .from('revision_boards')
                        .delete()
                        .eq('id', boardId);

                    if (error) throw error;

                    showNotification('Board deleted', 'success');
                    await loadBoards();
                    
                } catch (error) {
                  
                    showNotification('Failed to delete board', 'error');
                }
            }
        );
    };

    
    
    
    window.duplicateBoard = async function(boardId) {
        try {
            const { data: original, error: fetchError } = await window.supabaseClient
                .from('revision_boards')
                .select('*')
                .eq('id', boardId)
                .single();

            if (fetchError) throw fetchError;

            const duplicate = {
                user_id: currentUser.id,
                title: `${original.title} (Copy)`,
                description: original.description,
                subject_id: original.subject_id,
                content: original.content,
                is_public: false
            };

            const { error } = await window.supabaseClient
                .from('revision_boards')
                .insert(duplicate);

            if (error) throw error;

            showNotification('Board duplicated successfully!', 'success');
            await loadBoards();
            
        } catch (error) {

            showNotification('Failed to duplicate board', 'error');
        }
    };

    
    
    
    async function awardXP(amount, reason) {
        try {
            await window.supabaseClient
                .rpc('increment_xp', {
                    user_uuid: currentUser.id,
                    xp_amount: amount
                });


        } catch (error) {

        }
    }

    
    
    
    function showLoading() {
        loadingState.style.display = 'flex';
        errorState.style.display = 'none';
        emptyState.style.display = 'none';
        boardsGrid.style.display = 'none';
    }

    function hideLoading() {
        loadingState.style.display = 'none';
    }

    function showError() {
        loadingState.style.display = 'none';
        errorState.style.display = 'flex';
        boardsGrid.style.display = 'none';
    }

    function showEmpty() {
        emptyState.style.display = 'flex';
        boardsGrid.style.display = 'none';
    }

    function hideEmpty() {
        emptyState.style.display = 'none';
        boardsGrid.style.display = 'grid';
    }

    function showNotification(message, type = 'info') {
        const colors = {
            success: '#10B981',
            error: '#F56565',
            info: '#3B82F6'
        };

        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${colors[type]};
            color: white;
            padding: 16px 24px;
            border-radius: 12px;
            box-shadow: 0 8px 20px rgba(0,0,0,0.2);
            z-index: 10001;
            animation: slideIn 0.3s ease;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

   
    
    
    
    function setupEventListeners() {
        
        if (createBoardBtn) {
            createBoardBtn.addEventListener('click', openCreateModal);
        }

        
        if (subjectFilter) {
            subjectFilter.addEventListener('change', (e) => {
                currentFilter = e.target.value;
                loadBoards();
            });
        }

        
        viewBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                currentView = btn.dataset.view;
                
                viewBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                displayBoards(allBoards);
            });
        });
    }

    
    
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();