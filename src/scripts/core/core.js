;(function(){

  'use strict'

  /**
   * Object do nosso core
   *
   * no @return
   */
  var Circular = function(){
    this.modules = {}
  }
  var circular

  /**
   * Pega a instance de um módulo
   *
   * @param {String} name - Nome do módulo (sem path)
   * @returns {Object} - Instancia do módulo requisitado
   */
  Circular.prototype.use = function(name){
    var module = this.modules[name]

    if (module) {
      //throw('Module ' + module + ' not available')
    }

    return module || {}
  }

  /**
   * Itera pelos módulos executando uma função
   *
   * @param {function} func - Função a ser executada a cada módulo
   * no @return
   */
  Circular.prototype.eachModule = function(func){
    var self = this

    Object.keys(this.modules).forEach(function(module){
      func.apply(self, [self.use(module)])
    })
  }

  /**
   * Registra um novo módulo
   *
   * @param {Object} moduleDefinition - Objeto de um módulo
   * no @return
   */
  Circular.prototype.registerNewModule = function(moduleDefinition){

    var instance

    var init = moduleDefinition._init || function(){ return moduleDefinition._var }

    if (moduleDefinition._init) {
      instance = new moduleDefinition._init(circular)
    } else if (moduleDefinition._var) {
      instance = {
        name: moduleDefinition.name,
        _var: moduleDefinition._var
      }
    }

    instance.name = moduleDefinition.name

    var instanteStatus = this.use(moduleDefinition.name).status

    if ('loading' === instanteStatus) {

      instance.status = 'loaded'

      this.modules[moduleDefinition.name] = instance

      Circular.prototype.checkModuleDependencies.apply(circular)
    }
  }

  /**
   * Retorna o nome de um módulo pelo filename de um path
   *
   * @returns {String} - Nome do módulo
   */
  Circular.prototype.getModuleName = function(path){
    return path.split('/').pop().split('.js').shift()
  }

  /**
   * Verifica e notifica se  as dependências de um módulo estão carregadas
   * também carrega as dependências não carregadas
   *
   * no @return
   */
  Circular.prototype.checkModuleDependencies = function(){
    var self = this

    self.eachModule(function(module){
      var deps = module.dependencies || []

      var allLoaded = self.isAllLoaded(module.dependencies)

      if (allLoaded) {
        module.moduleReady = true
        console.log(module.name, 'Emmit event this module is ready to run')
        self.emmit(module.name + 'ModuleReady')
      } else {
        self.loadModule(deps)
      }
    })
  }

  /**
   * Retorna de todas as dependências de um module estão carregadas
   *
   * @param {String} module - Nome ou Path do module a ser carregado
   * @returns {Boolean} result
   */
  Circular.prototype.isAllLoaded = function(dependencies){

    var self = this

    dependencies = dependencies || []

    var result = true

    dependencies.forEach(function(value){
      if (!(self.getModuleName(value) in self.modules)) {
        result = false
      }
    }, 0)

    return result
  }

  /**
   * Carrega um módulos e listas de módulos
   *
   * @param {String|Array|Object} moduleRepresentation - Nome ou Path do module a ser carregado ou uma lista de nomes e paths
   * no @return
   */
  Circular.prototype.loadModule = function(moduleRepresentation){

    var self = this

    var actionsForEachType = {

      /**
       * Carrega um module pelo nome ou path
       *
       * @param {String} module - Nome ou Path do module a ser carregado
       * no @return
       */
      string: function(module){
        var moduleName = self.getModuleName(module)
        var script = document.createElement('script')

        if (!!self.use(moduleName).status) {
          return
        }

        self.modules[moduleName] = {
          status: 'loading'
        }

        script.src = module + '.js'

        script.addEventListener('load', function(event){
          Circular.prototype.loadModuleComplete.apply(circular, [event, script, moduleName])
        }, false)

        script.addEventListener('error', function(event){
          var src = event.target.getAttribute('src')

          moduleName = self.getModuleName(src)

          Circular.prototype.loadModuleError.apply(circular, [event, script, moduleName])
        }, false)

        document.body.appendChild(script)
      },

      /**
       * Itera por Array ou Objeto de módulo e chamada loadModule para cada módulo
       *
       * @param {Object} moduleRepresentation - Nada mais que um Array ou Object de modules
       * no @return
       */
      object: function(moduleRepresentation){
        Object.keys(moduleRepresentation).forEach(function(moduleIndex){
          Circular.prototype.loadModule.apply(circular, [moduleRepresentation[moduleIndex]])
        })
      }
    }

    var action = actionsForEachType[ (typeof moduleRepresentation).toLowerCase() ] || function(){}

    action(moduleRepresentation)
  }

  /**
   * Método usando quando um modulo é carregado com sucesso
   *
   * @param {Object} event - Event Object
   * @param {Object} script - Script tag
   * @param {String} moduleName - Nome do módulo
   * no @return
   */
  Circular.prototype.loadModuleComplete = function(event, script, moduleName){
    Circular.prototype.emmit.apply(circular, ['registerNewModule'])

    //remove all script tags in a apropriate moment
    //i don't know what is this moment right now
    //script.parentElement.removeChild(script)
  }

  /**
   * Método usando quando um modulo falha o carregamento
   *
   * @param {Object} event - Event Object
   * @param {Object} script - Script tag
   * @param {String} moduleName - Nome do módulo
   * no @return
   */
  Circular.prototype.loadModuleError = function(event, script, moduleName){
    var module = this.use(moduleName)

    if (!module) {
      return
    }

    module.status = 'error'

    //remove all script tags in a apropriate moment
    //i don't know what is this moment right now
    //script.parentElement.removeChild(script)
  }

  /**
   * @param {string} eventName - Nome do evento a ser disparado
   * no @return
   */
  Circular.prototype.emmit = function(eventName){

    var fireOnThis = document

    if( document.createEvent ) {
      var evObj = document.createEvent('MouseEvents')
      evObj.circular = circular
      evObj.initEvent( eventName, true, false )
      fireOnThis.dispatchEvent( evObj )
    } else if (document.createEventObject) { //ie
      var evObj = document.createEventObject()
      fireOnThis.fireEvent( 'on' + eventName, evObj )
    }
  }

  /*
    init aplication
  */
  circular = new Circular()

  circular.loadModule(['scripts/modules/start'])
}())
